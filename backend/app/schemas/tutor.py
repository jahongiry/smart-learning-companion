from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class TutorChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    request_id: UUID


class MemorySource(BaseModel):
    id: str
    title: str
    kind: str
    date: str
    excerpt: str


class TutorChatResponse(BaseModel):
    reply: str
    sources: list[MemorySource] = Field(default_factory=list)
