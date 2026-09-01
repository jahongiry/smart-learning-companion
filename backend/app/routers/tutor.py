from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.tutor import TutorChatRequest, TutorChatResponse
from app.services.student_context import load_profile, load_recent_history, summarize_history
from app.services.tutor_chat import get_tutor_reply
from app.services.tutor_prompts import build_system_prompt

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


@router.post("/chat", response_model=TutorChatResponse)
def chat(
    payload: TutorChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = load_profile(db, current_user.id)
    attempts, explanations = load_recent_history(db, current_user.id, limit=10)
    history_summary = summarize_history(attempts, explanations)

    system_prompt = build_system_prompt(current_user.name, profile, history_summary)

    try:
        reply = get_tutor_reply(system_prompt, payload.messages)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return TutorChatResponse(reply=reply)
