from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.quiz import QuizAttempt
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.quiz import QuizAttemptRead, QuizGenerateRequest, QuizGenerateResponse, QuizSubmitRequest
from app.services.quiz_generator import generate_quiz

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizGenerateResponse)
def generate(payload: QuizGenerateRequest, current_user: User = Depends(get_current_user)):
    try:
        questions = generate_quiz(payload.subject, payload.topic, payload.difficulty, payload.question_count)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return QuizGenerateResponse(questions=questions)


@router.post("/submit", response_model=QuizAttemptRead, status_code=status.HTTP_201_CREATED)
def submit(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score_percent = round((payload.correct_count / payload.total_questions) * 100)
    attempt = QuizAttempt(
        user_id=current_user.id,
        subject=payload.subject,
        topic=payload.topic,
        difficulty=payload.difficulty,
        total_questions=payload.total_questions,
        correct_count=payload.correct_count,
        score_percent=score_percent,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/history", response_model=list[QuizAttemptRead])
def history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )
