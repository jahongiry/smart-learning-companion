from pydantic import BaseModel


class LearningPathRecommendation(BaseModel):
    subject: str
    topic: str
    reason: str
    suggested_action: str


class LearningPathResponse(BaseModel):
    summary: str
    recommendations: list[LearningPathRecommendation]
