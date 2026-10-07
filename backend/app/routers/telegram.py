from datetime import timedelta
from hashlib import sha256
import hmac
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.telegram import TelegramConnection, TelegramUpdate, TelegramDaily
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.telegram import TelegramPreferences
from app.services.telegram_worker import aware, clear_link, disconnect, next_due, process_incoming, run_worker, utcnow

router = APIRouter(prefix='/api/telegram', tags=['telegram'])


def configured():
    return bool(settings.telegram_enabled and settings.telegram_bot_token and settings.telegram_bot_username
                and settings.telegram_webhook_secret and settings.cron_secret)


def require_configured():
    if not configured():
        raise HTTPException(503, 'Telegram is not available yet.')


def connection(db, user_id):
    conn = db.query(TelegramConnection).filter_by(user_id=user_id).with_for_update().first()
    if conn is None:
        db.query(User).filter_by(id=user_id).with_for_update().one()
        conn = db.query(TelegramConnection).filter_by(user_id=user_id).with_for_update().first()
    if conn is None:
        conn = TelegramConnection(user_id=user_id)
        db.add(conn)
        db.flush()
    return conn


def status_body(conn):
    valid_pending = bool(conn and conn.pending_chat_id and conn.link_expires_at and aware(conn.link_expires_at) > utcnow())
    return {
        'available': configured(), 'connected': bool(conn and conn.chat_id),
        'bot_username': settings.telegram_bot_username if configured() else None,
        'username': conn.username if conn and conn.chat_id else None,
        'pending': {'username': conn.pending_username, 'chat_id': str(conn.pending_chat_id)} if valid_pending else None,
        'daily_enabled': conn.daily_enabled if conn else False,
        'timezone': conn.timezone if conn else 'Australia/Sydney',
        'daily_time': conn.daily_time if conn else '18:00',
        'question_limit': settings.telegram_daily_question_limit,
    }


@router.get('/status')
def status(response: Response, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response.headers['Cache-Control'] = 'no-store'
    return status_body(db.get(TelegramConnection, user.id))


@router.post('/link')
def create_link(response: Response, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_configured()
    conn = connection(db, user.id)
    if conn.chat_id:
        raise HTTPException(409, 'Disconnect the current Telegram account before linking another.')
    clear_link(conn)
    token = secrets.token_urlsafe(32)
    conn.link_hash = sha256(token.encode()).hexdigest()
    conn.link_expires_at = utcnow() + timedelta(minutes=10)
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return {'url': f'https://t.me/{settings.telegram_bot_username}?start={token}', 'expires_in': 600}


@router.post('/confirm')
def confirm(payload: TelegramPreferences, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_configured()
    conn = connection(db, user.id)
    if not conn.pending_chat_id or not conn.link_expires_at or aware(conn.link_expires_at) <= utcnow():
        raise HTTPException(409, 'No pending Telegram account. Create a new connection link.')
    other = db.query(TelegramConnection).filter(TelegramConnection.chat_id == conn.pending_chat_id,
                                               TelegramConnection.user_id != user.id).first()
    if other:
        raise HTTPException(409, 'This Telegram account is already connected to another user.')
    conn.chat_id, conn.username = conn.pending_chat_id, conn.pending_username
    conn.daily_enabled, conn.timezone, conn.daily_time = payload.daily_enabled, payload.timezone, payload.daily_time
    conn.next_due_at = next_due(conn.timezone, conn.daily_time, utcnow()) if conn.daily_enabled else None
    clear_link(conn)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This Telegram account is already connected to another user.') from None
    return status_body(conn)


@router.patch('/preferences')
def preferences(payload: TelegramPreferences, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conn = connection(db, user.id)
    if not conn.chat_id:
        raise HTTPException(409, 'Connect Telegram first.')
    conn.daily_enabled, conn.timezone, conn.daily_time = payload.daily_enabled, payload.timezone, payload.daily_time
    conn.next_due_at = next_due(conn.timezone, conn.daily_time, utcnow()) if conn.daily_enabled else None
    if not conn.daily_enabled:
        db.query(TelegramDaily).filter(TelegramDaily.user_id == user.id,
                                      TelegramDaily.status.in_(['pending', 'sending'])).update({'status': 'cancelled'})
    db.commit()
    return status_body(conn)


@router.delete('/connection', status_code=204)
def unlink(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conn = connection(db, user.id)
    disconnect(db, conn)
    db.commit()
    return Response(status_code=204)


@router.post('/webhook')
async def webhook(request: Request, x_telegram_bot_api_secret_token: str = Header(default=''), db: Session = Depends(get_db)):
    require_configured()
    if not hmac.compare_digest(x_telegram_bot_api_secret_token, settings.telegram_webhook_secret):
        raise HTTPException(403, 'Invalid webhook secret')
    body = await request.body()
    if len(body) > 32768:
        raise HTTPException(413, 'Update too large')
    try:
        update = await request.json()
        update_id = update['update_id']
        if type(update_id) is not int:
            raise ValueError()
        callback = update.get('callback_query')
        msg = callback.get('message', {}) if callback else update.get('message', {})
        sender = callback.get('from', {}) if callback else msg.get('from', {})
        chat = msg.get('chat', {})
        chat_id = chat.get('id')
        # Link and tutor access are private-chat only, and must be the sender's own chat.
        if chat.get('type') != 'private' or type(chat_id) is not int or chat_id != sender.get('id') or sender.get('is_bot'):
            return {'ok': True}
        conn = db.query(TelegramConnection).filter_by(chat_id=chat_id).first()
        if callback:
            payload = {'kind': 'answer', 'data': str(callback.get('data', ''))[:64],
                       'user_id': conn.user_id if conn else None}
        else:
            payload = {'kind': 'question', 'text': str(msg.get('text', ''))[:2001],
                       'username': str(sender.get('username') or sender.get('first_name') or chat_id)[:100],
                       'user_id': conn.user_id if conn else None}
        if not db.get(TelegramUpdate, update_id):
            # Bounded pending queue per chat. Telegram retries a rejected update later.
            count = db.query(TelegramUpdate).filter(TelegramUpdate.chat_id == chat_id,
                TelegramUpdate.status.in_(['pending', 'sending'])).count()
            if count >= 10:
                raise HTTPException(429, 'Too many pending messages')
            db.add(TelegramUpdate(update_id=update_id, chat_id=chat_id, payload=payload))
            try:
                db.commit()
            except IntegrityError:
                db.rollback()  # another webhook stored this same update
        if settings.telegram_process_inline:
            await run_in_threadpool(process_incoming, db, update_id)
        if callback:
            return {'method': 'answerCallbackQuery', 'callback_query_id': callback['id'], 'text': 'Checking your answer…'}
        return {'ok': True}
    except (ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(400, 'Invalid Telegram update') from None


@router.get('/worker')
def worker(authorization: str = Header(default=''), db: Session = Depends(get_db)):
    if not settings.cron_secret or not hmac.compare_digest(authorization, f'Bearer {settings.cron_secret}'):
        raise HTTPException(403, 'Invalid scheduler secret')
    require_configured()
    return run_worker(db)
