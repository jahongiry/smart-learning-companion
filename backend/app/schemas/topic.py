from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.quiz import QuizSubject

YearLevel = Literal["Year 9", "Year 10", "Year 11", "Year 12"]


class TopicExplainRequest(BaseModel):
    subject: QuizSubject
    topic: str
    year_level: YearLevel


class TopicExplainResponse(BaseModel):
    summary: str
    key_points: list[str]
    example: str
    practice_tip: str


class TopicExplanationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    topic: str
    year_level: str
    created_at: datetime
