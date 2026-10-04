from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

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

    @model_validator(mode="after")
    def valid_options(self):
        ids = [option.id for option in self.options]
        if len(ids) < 2 or len(ids) != len(set(ids)) or self.correct_option_id not in ids:
            raise ValueError("Questions must have distinct options and a valid answer key")
        return self


class QuizGenerateRequest(BaseModel):
    subject: QuizSubject
    topic: str = Field(min_length=1, max_length=100)
    difficulty: QuizDifficulty
    question_count: int = Field(ge=1, le=15)


class QuizGenerateResponse(BaseModel):
    quiz_id: str
    questions: list[QuizQuestion]


class QuizAnswerSubmission(BaseModel):
    question_id: str = Field(max_length=100)
    selected_option_id: str | None = Field(default=None, max_length=100)


class QuizSubmitRequest(BaseModel):
    quiz_id: str = Field(min_length=1, max_length=36)
    answers: list[QuizAnswerSubmission] = Field(min_length=1, max_length=15)


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
