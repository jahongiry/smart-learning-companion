from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.captcha import require_captcha
from app.db.session import get_db
from app.models.quiz import QuizAttempt
from app.models.memory import LearningMemory, SavedQuiz
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.quiz import QuizAttemptRead, QuizGenerateRequest, QuizGenerateResponse, QuizSubmitRequest
from app.services.quiz_generator import generate_quiz

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizGenerateResponse, dependencies=[Depends(require_captcha("quiz"))])
def generate(payload: QuizGenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        questions = generate_quiz(payload.subject, payload.topic, payload.difficulty, payload.question_count)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    saved = SavedQuiz(user_id=current_user.id, subject=payload.subject, topic=payload.topic,
                      difficulty=payload.difficulty, questions=[q.model_dump() for q in questions])
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return QuizGenerateResponse(quiz_id=saved.id, questions=questions)


@router.post("/submit", response_model=QuizAttemptRead, status_code=status.HTTP_201_CREATED)
def submit(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lock the quiz so retries/concurrent submissions create only one attempt.
    saved = db.query(SavedQuiz).filter(SavedQuiz.id == payload.quiz_id,
                                     SavedQuiz.user_id == current_user.id).with_for_update().first()
    if saved is None:
        raise HTTPException(status_code=404, detail="Quiz not found. Please generate a new quiz.")
    if saved.attempt_id is not None:
        if {a['question_id']: a['selected_option_id'] for a in saved.answers} != {
            a.question_id: a.selected_option_id for a in payload.answers
        }:
            raise HTTPException(status_code=409, detail="This quiz was already submitted with different answers. See Progress for the saved result.")
        return db.get(QuizAttempt, saved.attempt_id)
    supplied = {a.question_id: a.selected_option_id for a in payload.answers}
    if len(supplied) != len(payload.answers) or set(supplied) != {q['id'] for q in saved.questions}:
        raise HTTPException(status_code=422, detail="Submit one answer for each quiz question.")
    for question in saved.questions:
        selected = supplied[question['id']]
        if selected is not None and selected not in {o['id'] for o in question['options']}:
            raise HTTPException(status_code=422, detail="An answer is not a valid quiz option.")
    correct_count = sum(supplied[q['id']] == q['correct_option_id'] for q in saved.questions)
    total_questions = len(saved.questions)
    score_percent = round((correct_count / total_questions) * 100)
    attempt = QuizAttempt(
        user_id=current_user.id,
        subject=saved.subject,
        topic=saved.topic,
        difficulty=saved.difficulty,
        total_questions=total_questions,
        correct_count=correct_count,
        score_percent=score_percent,
    )
    db.add(attempt)
    db.flush()
    saved.attempt_id = attempt.id
    saved.answers = [a.model_dump() for a in payload.answers]
    lines = [f"Score: {score_percent}% ({correct_count}/{total_questions}); difficulty: {saved.difficulty}."]
    for q in saved.questions:
        options = {o['id']: o['text'] for o in q['options']}
        chosen = supplied[q['id']]
        outcome = 'Correct' if chosen == q['correct_option_id'] else 'Incorrect'
        lines.append(f"{outcome}: {q['prompt']}\nStudent answer: {options.get(chosen, 'Unanswered')}\n"
                     f"Answer key: {options[q['correct_option_id']]}\nExplanation: {q['explanation']}")
    db.add(LearningMemory(user_id=current_user.id, source_type="quiz", source_id=str(attempt.id),
                          title=f"{saved.subject}: {saved.topic}", content="\n".join(lines)))
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
