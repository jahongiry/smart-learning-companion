"""Durable inbox and daily outbox. Each step is committed before the next external call.

Workers use row locks/skip_locked on PostgreSQL. Telegram has no idempotency key:
a crash after sending but before committing may repeat that one message.
"""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import time
import logging
from pydantic import ValidationError
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.memory import LearningMemory
from app.models.quiz import QuizAttempt
from app.models.telegram import TelegramConnection, TelegramDaily, TelegramUpdate
from app.models.user import User
from app.services.telegram_api import TelegramError, message, telegram_call
from app.services.telegram_learning import generate_daily, telegram_reply


logger = logging.getLogger(__name__)


def log_failure(kind, exc):
    details = [{'type': error['type'], 'loc': error['loc']} for error in exc.errors()] if isinstance(exc, ValidationError) else []
    logger.warning('Telegram %s failed: %s status=%s validation=%s', kind, type(exc).__name__,
                   getattr(exc, 'status_code', None), details)


def utcnow():
    return datetime.now(timezone.utc)


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def next_due(zone: str, clock: str, now: datetime):
    tz = ZoneInfo(zone)
    local = now.astimezone(tz)
    hour, minute = map(int, clock.split(':'))
    candidate = local.replace(hour=hour, minute=minute, second=0, microsecond=0, fold=0)
    if candidate.astimezone(timezone.utc) <= now:
        candidate = candidate + timedelta(days=1)
    # UTC conversion naturally advances nonexistent spring-forward times.
    return candidate.astimezone(timezone.utc)


def clear_link(conn):
    conn.link_hash = conn.link_expires_at = conn.pending_chat_id = conn.pending_username = None


def disconnect(db: Session, conn: TelegramConnection):
    conn.chat_id = conn.username = conn.next_due_at = None
    conn.daily_enabled = False
    clear_link(conn)
    db.query(TelegramDaily).filter(TelegramDaily.user_id == conn.user_id,
                                  TelegramDaily.status.in_(['pending', 'sending'])).update({'status': 'cancelled'})


def question_message(daily, index):
    q = daily.content['questions'][index]
    lines = [f"Daily quiz {index + 1}/5 · {daily.content['topic']}", q['prompt']]
    lines.extend(f"{chr(65 + i)}. {text}" for i, text in enumerate(q['options']))
    return message(daily.chat_id, '\n\n'.join(lines), reply_markup={'inline_keyboard': [[
        {'text': chr(65 + i), 'callback_data': f'd:{daily.id}:{index}:{i}'} for i in range(len(q['options']))
    ]]})


def answer_question(db, job, conn):
    callback = job.payload
    try:
        prefix, daily_id, index, selected = callback['data'].split(':')
        index, selected = int(index), int(selected)
        if prefix != 'd' or index < 0 or selected < 0:
            raise ValueError()
    except (KeyError, ValueError):
        return [message(job.chat_id, 'This question is no longer available.')]
    daily = db.query(TelegramDaily).filter_by(id=daily_id, user_id=conn.user_id, chat_id=job.chat_id).with_for_update().first()
    if not daily or not daily.content or index >= 5 or selected >= len(daily.content['questions'][index]['options']):
        return [message(job.chat_id, 'This question is no longer available.')]
    if str(index) in daily.answers:
        return []
    q = daily.content['questions'][index]
    answers = {**daily.answers, str(index): selected}
    daily.answers = answers
    correct = selected == q['correct_index']
    text = (f"Question {index + 1}: {'Correct!' if correct else 'Not quite.'}\n"
            f"Answer: {q['options'][q['correct_index']]}\n\n{q['explanation']}")
    replies = [message(job.chat_id, text)]
    if len(answers) == 5 and daily.attempt_id is None:
        count = sum(answers[str(i)] == item['correct_index'] for i, item in enumerate(daily.content['questions']))
        attempt = QuizAttempt(user_id=conn.user_id, subject=daily.content['subject'], topic=daily.content['topic'],
                              difficulty=daily.content['difficulty'], total_questions=5, correct_count=count,
                              score_percent=count * 20)
        db.add(attempt)
        db.flush()
        daily.attempt_id = attempt.id
        details = [f'Telegram daily quiz: {count}/5 correct.']
        for i, item in enumerate(daily.content['questions']):
            result = 'Correct' if answers[str(i)] == item['correct_index'] else 'Incorrect'
            details.append(f"{result}: {item['prompt']}\nStudent answer: {item['options'][answers[str(i)]]}\n"
                           f"Answer key: {item['options'][item['correct_index']]}\nExplanation: {item['explanation']}")
        db.add(LearningMemory(user_id=conn.user_id, source_type='quiz', source_id=str(attempt.id),
                              title=f"{daily.content['subject']}: {daily.content['topic']}", content='\n'.join(details)))
        replies.append(message(job.chat_id, f'Finished! You scored {count}/5 ({count * 20}%). Your website progress is updated.'))
    return replies


def prepare_update(db, job):
    text = job.payload.get('text', '').strip()
    if text.startswith('/start '):
        token = text.split(maxsplit=1)[1]
        conn = db.query(TelegramConnection).filter_by(link_hash=sha256(token.encode()).hexdigest()).with_for_update().first()
        if not conn or not conn.link_expires_at or aware(conn.link_expires_at) <= utcnow():
            return [message(job.chat_id, 'This link expired. Open the website and select Connect Telegram again.')]
        existing = db.query(TelegramConnection).filter_by(chat_id=job.chat_id).first()
        if existing and existing.user_id != conn.user_id:
            return [message(job.chat_id, 'This Telegram is already connected. Disconnect it from the previous website account first.')]
        conn.pending_chat_id = job.chat_id
        conn.pending_username = job.payload.get('username') or f'Telegram user {job.chat_id}'
        conn.link_hash = None  # one use, even before website confirmation
        return [message(job.chat_id, 'Return to the website and confirm this Telegram account to finish connecting. No learning data is shared until you confirm.')]
    conn = db.query(TelegramConnection).filter_by(chat_id=job.chat_id).with_for_update().first()
    if not conn:
        return [message(job.chat_id, f'Connect your account from the website first: {settings.frontend_url}/telegram')]
    if job.payload.get('user_id') != conn.user_id:
        return [message(job.chat_id, 'Your connection changed. Please send this message again.')]
    if job.payload.get('kind') == 'answer':
        return answer_question(db, job, conn)
    command = text.split()[0].split('@')[0].lower() if text else ''
    if command == '/stop':
        conn.daily_enabled = False
        conn.next_due_at = None
        db.query(TelegramDaily).filter(TelegramDaily.user_id == conn.user_id,
                                      TelegramDaily.status.in_(['pending', 'sending'])).update({'status': 'cancelled'})
        return [message(job.chat_id, 'Daily messages paused. You can still ask questions. Use /resume to restart.')]
    if command == '/resume':
        conn.daily_enabled = True
        conn.next_due_at = next_due(conn.timezone, conn.daily_time, utcnow())
        return [message(job.chat_id, f'Daily quiz and fact enabled for {conn.daily_time} ({conn.timezone}).')]
    if command == '/disconnect':
        disconnect(db, conn)
        return [message(job.chat_id, 'Disconnected. Reconnect from the website whenever you want.')]
    if command in ('/start', '/help'):
        return [message(job.chat_id, 'Ask me a maths or science question. Your learning history helps me tailor the answer.\n'
                        '/stop — pause daily messages\n/resume — restart daily messages\n/disconnect — unlink your account\n'
                        f'Schedule and settings: {settings.frontend_url}/telegram')]
    if command.startswith('/'):
        return [message(job.chat_id, 'Use /help for commands, or type a study question.')]
    if not text or len(text) > 2000:
        return [message(job.chat_id, 'Please send a text question with 1–2,000 characters.')]
    day = utcnow().date().isoformat()
    if conn.quota_day != day:
        conn.quota_day, conn.question_count = day, 0
    if conn.question_count >= settings.telegram_daily_question_limit:
        return [message(job.chat_id, 'You have reached today’s Telegram question limit. Please try again tomorrow (UTC).')]
    # Share the same user lock as website tutor history and its deletion.
    user = db.query(User).filter_by(id=conn.user_id).with_for_update().one()
    reply = telegram_reply(db, user, text, job.update_id)
    conn.question_count += 1
    return [message(job.chat_id, reply)]


def send_step(job):
    if job.sent_count >= len(job.replies):
        job.status = 'done'
        job.payload = {}  # discard incoming linking tokens and duplicate question text
        return
    outgoing = job.replies[job.sent_count]
    telegram_call(outgoing['method'], outgoing['payload'])
    job.sent_count += 1
    if job.sent_count >= len(job.replies):
        job.status, job.payload = 'done', {}


def work_update(db, update_id=None):
    query = db.query(TelegramUpdate).filter(TelegramUpdate.status.in_(['pending', 'sending']),
                                         TelegramUpdate.available_at <= utcnow())
    if update_id is not None:
        query = query.filter(TelegramUpdate.update_id == update_id)
    job = query.order_by(TelegramUpdate.update_id).with_for_update(skip_locked=True).first()
    if not job:
        return False
    job_id = job.update_id
    try:
        if aware(job.created_at) < utcnow() - timedelta(hours=24):
            job.status, job.payload = 'expired', {}
        elif job.status == 'pending':
            job.replies = prepare_update(db, job)
            job.status = 'sending'
            job.attempts = 0
        else:
            # A disconnected account must not receive a queued AI reply.
            if job.payload.get('user_id') is not None and not job.payload.get('text', '').startswith('/'):
                conn = db.query(TelegramConnection).filter_by(chat_id=job.chat_id).with_for_update().first()
                if not conn or conn.user_id != job.payload.get('user_id'):
                    job.status, job.payload = 'cancelled', {}
                    db.commit()
                    return True
            send_step(job)
        db.commit()
    except Exception as exc:
        log_failure('delivery', exc)
        db.rollback()
        job = db.query(TelegramUpdate).filter_by(update_id=job_id).with_for_update().one()
        job.attempts += 1
        delay = exc.retry_after if isinstance(exc, TelegramError) else 60 * job.attempts
        job.available_at = utcnow() + timedelta(seconds=delay)
        if isinstance(exc, TelegramError) and exc.code == 403:
            conn = db.query(TelegramConnection).filter_by(chat_id=job.chat_id).with_for_update().first()
            if conn:
                disconnect(db, conn)
            job.status = 'failed'
        elif job.attempts >= 3:
            if job.status == 'pending':
                job.replies = [message(job.chat_id, 'The tutor is temporarily unavailable. Please try your question again later.')]
                job.status, job.attempts = 'sending', 0
            else:
                job.status = 'failed'
        db.commit()
    return True


def enqueue_daily(db):
    now = utcnow()
    rows = db.query(TelegramConnection).filter(TelegramConnection.daily_enabled.is_(True),
        TelegramConnection.chat_id.isnot(None), TelegramConnection.next_due_at <= now).order_by(
        TelegramConnection.next_due_at).with_for_update(skip_locked=True).limit(50).all()
    for conn in rows:
        local_day = now.astimezone(ZoneInfo(conn.timezone)).date().isoformat()
        if not db.query(TelegramDaily).filter_by(user_id=conn.user_id, local_day=local_day).first():
            db.add(TelegramDaily(user_id=conn.user_id, chat_id=conn.chat_id, local_day=local_day))
        conn.next_due_at = next_due(conn.timezone, conn.daily_time, now)
    db.commit()
    return len(rows)


def work_daily(db):
    candidate = db.query(TelegramDaily).filter(TelegramDaily.status.in_(['pending', 'sending']),
        TelegramDaily.available_at <= utcnow()).order_by(TelegramDaily.created_at).first()
    if not candidate:
        return False
    # All paths acquire the connection before its daily record (including pause/disconnect).
    conn = db.query(TelegramConnection).filter_by(user_id=candidate.user_id).with_for_update(skip_locked=True).first()
    if not conn:
        db.rollback()
        return False
    daily = db.query(TelegramDaily).filter(TelegramDaily.id == candidate.id,
        TelegramDaily.status.in_(['pending', 'sending'])).with_for_update(skip_locked=True).populate_existing().first()
    if not daily:
        db.rollback()
        return False
    daily_id = daily.id
    try:
        if (not conn or conn.chat_id != daily.chat_id or not conn.daily_enabled or
                daily.local_day != utcnow().astimezone(ZoneInfo(conn.timezone)).date().isoformat()):
            daily.status = 'cancelled'
        elif daily.content is None:
            daily.content = generate_daily(db, daily.user_id).model_dump()
            daily.status, daily.attempts = 'sending', 0
        else:
            outgoing = (message(daily.chat_id, f"Today's new fact · {daily.content['topic']}\n\n{daily.content['fact']}\n\n"
                                'Five practice questions follow. Tap an answer for feedback. /stop pauses daily messages.')
                        if daily.sent_count == 0 else question_message(daily, daily.sent_count - 1))
            telegram_call(outgoing['method'], outgoing['payload'])
            daily.sent_count += 1
            if daily.sent_count == 6:
                daily.status = 'done'
        db.commit()
    except Exception as exc:
        log_failure('delivery', exc)
        db.rollback()
        daily = db.query(TelegramDaily).filter_by(id=daily_id).with_for_update().one()
        daily.attempts += 1
        delay = exc.retry_after if isinstance(exc, TelegramError) else 60 * daily.attempts
        daily.available_at = utcnow() + timedelta(seconds=delay)
        if isinstance(exc, TelegramError) and exc.code == 403:
            conn = db.query(TelegramConnection).filter_by(user_id=daily.user_id).with_for_update().first()
            if conn:
                disconnect(db, conn)
            daily.status = 'failed'
        elif daily.attempts >= 3:
            daily.status = 'failed'
        db.commit()
    return True


def run_worker(db):
    queued = enqueue_daily(db)
    deadline = time.monotonic() + 45
    steps = 0
    # Alternate the inbox/outbox so neither can starve the other.
    for _ in range(10):
        if time.monotonic() >= deadline:
            break
        inbox = work_update(db)
        if time.monotonic() >= deadline:
            steps += int(inbox)
            break
        outbox = work_daily(db)
        steps += int(inbox) + int(outbox)
        if not inbox and not outbox:
            break
    return {'queued': queued, 'steps': steps}


def process_incoming(db, update_id):
    """Fast path for one webhook, with the scheduled worker as durable fallback."""
    deadline = time.monotonic() + 45
    for _ in range(3):  # prepare, reply, optional quiz-completion summary
        if time.monotonic() >= deadline or not work_update(db, update_id):
            break
