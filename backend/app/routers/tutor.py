from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.captcha import require_captcha
from app.db.session import get_db
from app.models.user import User
from app.models.memory import LearningMemory, TutorTurn
from app.routers.auth import get_current_user
from app.schemas.tutor import ChatMessage, TutorChatRequest, TutorChatResponse
from app.services.student_context import load_profile
from app.services.learning_memory import retrieve_learning_memory
from app.services.tutor_chat import get_tutor_reply
from app.services.tutor_prompts import build_system_prompt

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


@router.post("/chat", response_model=TutorChatResponse, dependencies=[Depends(require_captcha("tutor"))])
def chat(
    payload: TutorChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = payload.message.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Please enter a question.")
    # Serialize turns and deletion for one student; a clear cannot resurrect an in-flight chat.
    db.query(User).filter(User.id == current_user.id).with_for_update().first()
    existing = db.query(TutorTurn).filter(TutorTurn.user_id == current_user.id,
                                         TutorTurn.request_id == str(payload.request_id)).first()
    if existing:
        if existing.question != question:
            raise HTTPException(status_code=409, detail="This request was already used for a different question.")
        return TutorChatResponse(reply=existing.reply, sources=existing.sources)
    profile = load_profile(db, current_user.id)
    history_summary, sources = retrieve_learning_memory(db, current_user.id, question)

    system_prompt = build_system_prompt(current_user.name, profile, history_summary)

    try:
        recent = db.query(TutorTurn).filter(TutorTurn.user_id == current_user.id).order_by(
            TutorTurn.created_at.desc(), TutorTurn.id.desc()).limit(9).all()
        messages = []
        for turn in reversed(recent):
            messages.extend([ChatMessage(role="user", content=turn.question),
                             ChatMessage(role="assistant", content=turn.reply[:2000])])
        messages.append(ChatMessage(role="user", content=question))
        reply = get_tutor_reply(system_prompt, messages)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    if not reply.strip():
        raise HTTPException(status_code=502, detail="The tutor returned an empty reply. Please try again.")
    turn = TutorTurn(user_id=current_user.id, request_id=str(payload.request_id), question=question,
                     reply=reply, sources=sources)
    db.add(turn)
    try:
        db.flush()
        db.add(LearningMemory(user_id=current_user.id, source_type="chat", source_id=str(turn.id),
                              title=f"Tutor conversation: {question[:160]}",
                              content=f"Student said: {question}\nTutor suggested (not verified fact): {reply}"))
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(TutorTurn).filter(TutorTurn.user_id == current_user.id,
                                             TutorTurn.request_id == str(payload.request_id)).first()
        if not existing:
            raise
        if existing.question != question:
            raise HTTPException(status_code=409, detail="This request was already used for a different question.")
        return TutorChatResponse(reply=existing.reply, sources=existing.sources)
    return TutorChatResponse(reply=reply, sources=sources)


@router.get("/history")
def history(response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    turns = db.query(TutorTurn).filter(TutorTurn.user_id == current_user.id).order_by(
        TutorTurn.created_at.desc(), TutorTurn.id.desc()).limit(50).all()
    messages = []
    for turn in reversed(turns):
        messages.extend([{"role": "user", "content": turn.question, "created_at": turn.created_at},
                         {"role": "assistant", "content": turn.reply, "created_at": turn.created_at,
                          "sources": turn.sources}])
    return {"messages": messages}


@router.delete("/history", status_code=204)
def clear_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(User).filter(User.id == current_user.id).with_for_update().first()
    db.query(LearningMemory).filter(LearningMemory.user_id == current_user.id,
                                    LearningMemory.source_type == "chat").delete(synchronize_session=False)
    db.query(TutorTurn).filter(TutorTurn.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return Response(status_code=204)
