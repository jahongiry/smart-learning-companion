from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel, Field, field_validator, model_validator


class TelegramPreferences(BaseModel):
    daily_enabled: bool = False
    timezone: str = Field(default='Australia/Sydney', max_length=100)
    daily_time: str = Field(default='18:00', pattern=r'^([01]\d|2[0-3]):[0-5]\d$')

    @field_validator('timezone')
    @classmethod
    def valid_timezone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError('Choose a valid timezone, e.g. Australia/Sydney')
        return value


class DailyQuestion(BaseModel):
    prompt: str = Field(min_length=1, max_length=700)
    options: list[str] = Field(min_length=2, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1, max_length=600)

    @model_validator(mode='after')
    def valid_options(self):
        if self.correct_index >= len(self.options) or any(not x.strip() or len(x) > 200 for x in self.options):
            raise ValueError('Invalid answer options')
        if len(set(self.options)) != len(self.options):
            raise ValueError('Options must be distinct')
        return self


class DailyLesson(BaseModel):
    subject: Literal['Mathematics', 'Science']
    topic: str = Field(min_length=1, max_length=100)
    difficulty: Literal['Easy', 'Medium', 'Hard']
    fact: str = Field(min_length=1, max_length=1000)
    questions: list[DailyQuestion] = Field(min_length=5, max_length=5)
