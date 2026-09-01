from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.profile import UserProfile
from app.models.quiz import QuizAttempt
from app.models.topic import TopicExplanation
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.learning_path import LearningPathResponse
from app.services.learning_path_generator import generate_learning_path

router = APIRouter(prefix="/api/learning-path", tags=["learning-path"])


def _build_performance_summary(
    profile: UserProfile | None,
    attempts: list[QuizAttempt],
    explanations: list[TopicExplanation],
) -> str:
    lines = []

    if profile is not None:
        lines.append(f"Year level: {profile.year_level}")
        lines.append(f"Subjects they care about: {profile.subjects.replace(',', ', ')}")
        lines.append(f"Stated goal: {profile.goal}")
        lines.append(f"Self-rated confidence: {profile.confidence}")

    if not attempts and not explanations:
        lines.append("This student hasn't taken any quizzes or looked up any topic explanations yet.")
    else:
        lines += [
            f"- Quiz: {a.subject} / {a.topic} ({a.difficulty}) — {a.score_percent}% "
            f"({a.correct_count}/{a.total_questions} correct)"
            for a in attempts
        ]
        lines += [f"- Explored explanation: {e.subject} / {e.topic} ({e.year_level})" for e in explanations]

    return "\n".join(lines)


@router.get("/generate", response_model=LearningPathResponse)
def get_learning_path(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(20)
        .all()
    )
    explanations = (
        db.query(TopicExplanation)
        .filter(TopicExplanation.user_id == current_user.id)
        .order_by(TopicExplanation.created_at.desc())
        .limit(20)
        .all()
    )

    performance_summary = _build_performance_summary(profile, attempts, explanations)

    try:
        return generate_learning_path(performance_summary)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
