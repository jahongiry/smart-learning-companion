from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.quiz import QuizAttempt
from app.models.topic import TopicExplanation


def load_profile(db: Session, user_id: int) -> UserProfile | None:
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()


def load_recent_history(
    db: Session, user_id: int, limit: int = 20
) -> tuple[list[QuizAttempt], list[TopicExplanation]]:
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(limit)
        .all()
    )
    explanations = (
        db.query(TopicExplanation)
        .filter(TopicExplanation.user_id == user_id)
        .order_by(TopicExplanation.created_at.desc())
        .limit(limit)
        .all()
    )
    return attempts, explanations


def describe_profile(profile: UserProfile | None) -> list[str]:
    if profile is None:
        return []

    return [
        f"Year level: {profile.year_level}",
        f"Subjects they care about: {profile.subjects.replace(',', ', ')}",
        f"Stated goal: {profile.goal}",
        f"Self-rated confidence: {profile.confidence}",
    ]


def summarize_history(attempts: list[QuizAttempt], explanations: list[TopicExplanation]) -> str:
    if not attempts and not explanations:
        return "This student hasn't taken any quizzes or looked up any topic explanations yet."

    lines = [
        f"- Quiz: {a.subject} / {a.topic} ({a.difficulty}) — {a.score_percent}% "
        f"({a.correct_count}/{a.total_questions} correct)"
        for a in attempts
    ]
    lines += [f"- Explored explanation: {e.subject} / {e.topic} ({e.year_level})" for e in explanations]
    return "\n".join(lines)
