from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class TutorChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class TutorChatResponse(BaseModel):
    reply: str
