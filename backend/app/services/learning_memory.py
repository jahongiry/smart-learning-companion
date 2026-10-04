"""User-scoped retrieval of structured facts and relevant saved learning text.

SQL computes counts and scores; ranked text retrieval supplies supporting detail.
No vector service or extra API key is required. Retrieval is bounded, not exhaustive.
"""
from datetime import datetime, timedelta, timezone
import calendar
import json
import re

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.models.memory import LearningMemory
from app.models.quiz import QuizAttempt
from app.models.topic import TopicExplanation

STOP_WORDS = set("a an and are as at be been can could did do does for from had has have how i in is it me my of on or please should so some tell that the their them there these they this to was were what when which who why will with would you your about am doing study learning learned learn progress last month week year today yesterday advice next improve improving remember asked previously before explain help know all again".split())


def search_terms(question: str) -> list[str]:
    terms = [t for t in re.findall(r"[a-z0-9]+", question.lower()) if len(t) > 2 and t not in STOP_WORDS]
    # Small subject vocabulary helps common wording without claiming vector search.
    aliases = {"math": "mathematics", "maths": "mathematics", "equations": "equation",
               "fractions": "fraction", "mistakes": "incorrect", "wrong": "incorrect",
               "struggle": "incorrect", "struggling": "incorrect"}
    return list(dict.fromkeys(terms + [aliases[t] for t in terms if t in aliases]))[:12]


def date_window(question: str, now: datetime):
    text = question.lower()
    day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if "last month" in text:
        end = day.replace(day=1)
        return (end - timedelta(days=1)).replace(day=1), end
    if "this month" in text:
        return day.replace(day=1), now + timedelta(seconds=1)
    if "last week" in text:
        end = day - timedelta(days=day.weekday())
        return end - timedelta(days=7), end
    if "this week" in text:
        return day - timedelta(days=day.weekday()), now + timedelta(seconds=1)
    if "yesterday" in text:
        return day - timedelta(days=1), day
    if "today" in text:
        return day, day + timedelta(days=1)
    match = re.search(r"(?:last|past) (\d{1,3}) days", text)
    if match:
        return day - timedelta(days=int(match[1])), now + timedelta(seconds=1)
    for month in range(1, 13):
        match = re.search(rf"\b{calendar.month_name[month].lower()}(?:\s+(20\d{{2}}))?\b", text)
        if match:
            year = int(match[1]) if match[1] else now.year - int(month > now.month)
            start = datetime(year, month, 1, tzinfo=timezone.utc)
            end = datetime(year + int(month == 12), month % 12 + 1, 1, tzinfo=timezone.utc)
            return start, end
    match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    if match:
        try:
            start = datetime.fromisoformat(match[1]).replace(tzinfo=timezone.utc)
            return start, start + timedelta(days=1)
        except ValueError:
            pass
    return None


def relevance(columns, terms):
    return sum((case((or_(*(func.lower(c).contains(t, autoescape=True) for c in columns)), 1), else_=0)
                for t in terms), start=0)


def retrieve_learning_memory(db: Session, user_id: int, question: str, now: datetime | None = None):
    now = now or datetime.now(timezone.utc)
    terms = search_terms(question)
    window = date_window(question, now)
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id)
    explanations = db.query(TopicExplanation).filter(TopicExplanation.user_id == user_id)
    notes = db.query(LearningMemory).filter(LearningMemory.user_id == user_id)
    total_quizzes = attempts.count()
    total_topics = explanations.count()
    if window:
        start, end = window
        attempts = attempts.filter(QuizAttempt.created_at >= start, QuizAttempt.created_at < end)
        explanations = explanations.filter(TopicExplanation.created_at >= start, TopicExplanation.created_at < end)
        notes = notes.filter(LearningMemory.created_at >= start, LearningMemory.created_at < end)

    summary = {
        "current_date_utc": now.date().isoformat(),
        "all_time_quiz_attempts": total_quizzes,
        "all_time_explanation_requests": total_topics,
        "period_utc": [d.isoformat() for d in window] if window else "all time",
        "period_quiz_attempts": attempts.count(),
        "period_explanation_requests": explanations.count(),
        "note": "A requested explanation is evidence of activity, not proof of understanding. Older quiz summaries have no saved individual answers.",
    }
    groups = attempts.with_entities(QuizAttempt.subject, QuizAttempt.topic, QuizAttempt.difficulty,
                                   func.count(QuizAttempt.id), func.avg(QuizAttempt.score_percent),
                                   func.max(QuizAttempt.created_at)).group_by(
                                       QuizAttempt.subject, QuizAttempt.topic, QuizAttempt.difficulty)
    if terms:
        groups = groups.order_by(relevance([QuizAttempt.subject, QuizAttempt.topic], terms).desc())
    groups = groups.order_by(func.max(QuizAttempt.created_at).desc()).limit(8).all()
    summary["topic_statistics_subset"] = []
    for subject, topic, difficulty, count, average, _ in groups:
        matching = attempts.filter(QuizAttempt.subject == subject, QuizAttempt.topic == topic,
                                   QuizAttempt.difficulty == difficulty)
        first = matching.order_by(QuizAttempt.created_at, QuizAttempt.id).first()
        last = matching.order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc()).first()
        summary["topic_statistics_subset"].append({
            "subject": subject, "topic": topic, "difficulty": difficulty, "attempts": count,
            "average_percent": round(average, 1),
            "first": {"date": first.created_at.isoformat(), "score_percent": first.score_percent},
            "latest": {"date": last.created_at.isoformat(), "score_percent": last.score_percent},
        })
    summary["recent_quizzes_in_period"] = [
        {"id": a.id, "date": a.created_at.isoformat(), "topic": a.topic, "subject": a.subject,
         "difficulty": a.difficulty, "score_percent": a.score_percent}
        for a in attempts.order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc()).limit(8)]
    summary["recent_explanations_in_period"] = [
        {"date": e.created_at.isoformat(), "subject": e.subject, "topic": e.topic}
        for e in explanations.order_by(TopicExplanation.created_at.desc(), TopicExplanation.id.desc()).limit(8)]

    # Search all saved text for this user, not just their last ten events.
    selected = []
    if terms:
        rank = relevance([LearningMemory.title, LearningMemory.content], terms)
        selected = notes.filter(rank > 0).order_by(rank.desc(), LearningMemory.created_at.desc(),
                                                   LearningMemory.id.desc()).limit(6).all()
    if not selected:
        selected = notes.order_by(LearningMemory.created_at.desc(), LearningMemory.id.desc()).limit(4).all()
    sources = []
    evidence = []
    for record in selected:
        # Keep the matching passage, even when it occurs late in a long saved quiz.
        content = record.content
        positions = [content.lower().find(t) for t in terms if t in content.lower()]
        offset = max(0, min(positions) - 180) if positions else 0
        excerpt = content[offset:offset + 2800]
        evidence.append({"source_id": record.id, "type": record.source_type,
                         "title": record.title, "date": record.created_at.isoformat(), "excerpt": excerpt})
        sources.append({"id": str(record.id), "title": record.title,
                        "kind": record.source_type, "date": record.created_at.isoformat(),
                        "excerpt": excerpt[:350]})
    # Always expose the structured evidence, including for students with legacy history.
    sources.insert(0, {"id": "progress", "title": "Saved progress summary", "kind": "progress",
                       "date": now.isoformat(),
                       "excerpt": f"{summary['period_quiz_attempts']} quiz attempts and {summary['period_explanation_requests']} explanation requests in the selected period. Dates use UTC."})
    return json.dumps({"facts": summary, "retrieved_records": evidence,
                       "retrieval_limits": "At most 8 topic/difficulty groups and 6 text records. Text matching may miss paraphrases. Do not imply complete recall."}), sources
