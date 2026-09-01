from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.topic import TopicExplanation
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.topic import TopicExplainRequest, TopicExplainResponse, TopicExplanationRead
from app.services.topic_explainer import explain_topic

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.post("/explain", response_model=TopicExplainResponse)
def explain(
    payload: TopicExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        explanation = explain_topic(payload.subject, payload.topic, payload.year_level)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    db.add(
        TopicExplanation(
            user_id=current_user.id,
            subject=payload.subject,
            topic=payload.topic,
            year_level=payload.year_level,
        )
    )
    db.commit()

    return explanation


@router.get("/history", response_model=list[TopicExplanationRead])
def history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(TopicExplanation)
        .filter(TopicExplanation.user_id == current_user.id)
        .order_by(TopicExplanation.created_at.desc())
        .all()
    )
