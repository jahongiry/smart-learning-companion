import json
import uuid

from pydantic import ValidationError

from app.schemas.quiz import QuizQuestion
from app.services.anthropic_client import get_anthropic_client
from app.services.quiz_prompts import QUIZ_SYSTEM_PROMPT, build_user_prompt

MODEL = "claude-sonnet-5"


def generate_quiz(subject: str, topic: str, difficulty: str, question_count: int) -> list[QuizQuestion]:
    client = get_anthropic_client()

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=QUIZ_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(subject, topic, difficulty, question_count)}],
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text")

    try:
        raw_questions = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Claude returned a response that wasn't valid JSON") from exc

    try:
        return [
            QuizQuestion(id=str(uuid.uuid4()), subject=subject, topic=topic, difficulty=difficulty, **raw)
            for raw in raw_questions
        ]
    except (ValidationError, TypeError) as exc:
        raise ValueError("Claude returned questions that didn't match the expected shape") from exc
