from pydantic import BaseModel


class SubjectProgress(BaseModel):
    subject: str
    quizzes_taken: int
    average_score: int
    topics_explained: int


class ActivityItem(BaseModel):
    type: str
    subject: str
    topic: str
    detail: str
    created_at: str


class ProgressSummary(BaseModel):
    total_quizzes: int
    average_score: int
    total_topics_explained: int
    by_subject: list[SubjectProgress]
    recent_activity: list[ActivityItem]
