from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.quiz import QuizAttempt
from app.models.topic import TopicExplanation
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.progress import ActivityItem, ProgressSummary, SubjectProgress

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/summary", response_model=ProgressSummary)
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )
    explanations = (
        db.query(TopicExplanation)
        .filter(TopicExplanation.user_id == current_user.id)
        .order_by(TopicExplanation.created_at.desc())
        .all()
    )

    subjects = sorted({a.subject for a in attempts} | {e.subject for e in explanations})
    by_subject = []
    for subject in subjects:
        subject_attempts = [a for a in attempts if a.subject == subject]
        subject_explanations = [e for e in explanations if e.subject == subject]
        average = (
            round(sum(a.score_percent for a in subject_attempts) / len(subject_attempts))
            if subject_attempts
            else 0
        )
        by_subject.append(
            SubjectProgress(
                subject=subject,
                quizzes_taken=len(subject_attempts),
                average_score=average,
                topics_explained=len(subject_explanations),
            )
        )

    activity: list[ActivityItem] = [
        ActivityItem(
            type="quiz",
            subject=a.subject,
            topic=a.topic,
            detail=f"Scored {a.score_percent}% ({a.correct_count}/{a.total_questions})",
            created_at=a.created_at.isoformat(),
        )
        for a in attempts
    ] + [
        ActivityItem(
            type="topic",
            subject=e.subject,
            topic=e.topic,
            detail=f"Explained for {e.year_level}",
            created_at=e.created_at.isoformat(),
        )
        for e in explanations
    ]
    activity.sort(key=lambda item: item.created_at, reverse=True)

    total_quizzes = len(attempts)
    average_score = round(sum(a.score_percent for a in attempts) / total_quizzes) if total_quizzes else 0

    return ProgressSummary(
        total_quizzes=total_quizzes,
        average_score=average_score,
        total_topics_explained=len(explanations),
        by_subject=by_subject,
        recent_activity=activity[:10],
    )
