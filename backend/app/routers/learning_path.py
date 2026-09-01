from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.learning_path import LearningPathResponse
from app.services.learning_path_generator import generate_learning_path
from app.services.student_context import describe_profile, load_profile, load_recent_history, summarize_history

router = APIRouter(prefix="/api/learning-path", tags=["learning-path"])


@router.get("/generate", response_model=LearningPathResponse)
def get_learning_path(
    focus: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = load_profile(db, current_user.id)
    attempts, explanations = load_recent_history(db, current_user.id)

    lines = describe_profile(profile) + [summarize_history(attempts, explanations)]
    if focus and focus.strip():
        lines.append(f"The student specifically asked to focus on: {focus.strip()}")
    performance_summary = "\n".join(lines)

    try:
        return generate_learning_path(performance_summary)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
