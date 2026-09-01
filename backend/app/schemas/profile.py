from typing import Literal

from pydantic import BaseModel, field_validator

from app.schemas.quiz import QuizSubject
from app.schemas.topic import YearLevel

Goal = Literal[
    "Catch up on the basics",
    "Keep pace with class",
    "Get ahead / go deeper",
    "Prepare for an upcoming exam",
]
Confidence = Literal["Just starting out", "Fairly confident", "Very confident"]


class UserProfileCreate(BaseModel):
    year_level: YearLevel
    subjects: list[QuizSubject]
    goal: Goal
    confidence: Confidence

    @field_validator("subjects")
    @classmethod
    def at_least_one_subject(cls, value: list[QuizSubject]) -> list[QuizSubject]:
        if not value:
            raise ValueError("Select at least one subject")
        return value


class UserProfileRead(BaseModel):
    year_level: str
    subjects: list[str]
    goal: str
    confidence: str
