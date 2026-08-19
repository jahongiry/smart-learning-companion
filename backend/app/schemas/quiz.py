from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

QuizSubject = Literal["Mathematics", "Science"]
QuizDifficulty = Literal["Easy", "Medium", "Hard"]


class QuizOption(BaseModel):
    id: str
    text: str


class QuizQuestion(BaseModel):
    id: str
    subject: QuizSubject
    topic: str
    difficulty: QuizDifficulty
    prompt: str
    options: list[QuizOption]
    correct_option_id: str
    explanation: str


class QuizGenerateRequest(BaseModel):
    subject: QuizSubject
    topic: str
    difficulty: QuizDifficulty
    question_count: int = Field(ge=1, le=15)


class QuizGenerateResponse(BaseModel):
    questions: list[QuizQuestion]


class QuizSubmitRequest(BaseModel):
    subject: QuizSubject
    topic: str
    difficulty: QuizDifficulty
    total_questions: int = Field(ge=1)
    correct_count: int = Field(ge=0)


class QuizAttemptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    topic: str
    difficulty: str
    total_questions: int
    correct_count: int
    score_percent: int
    created_at: datetime
