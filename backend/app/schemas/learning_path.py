from typing import Literal

from pydantic import BaseModel


class LearningPathRecommendation(BaseModel):
    subject: str
    topic: str
    reason: str
    suggested_action: str
    action_type: Literal["quiz", "explanation"] | None = None
    difficulty: Literal["Easy", "Medium", "Hard"] | None = None


class LearningPathResponse(BaseModel):
    summary: str
    recommendations: list[LearningPathRecommendation]
