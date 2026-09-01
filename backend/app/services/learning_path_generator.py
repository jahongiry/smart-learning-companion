import json

from pydantic import ValidationError

from app.schemas.learning_path import LearningPathResponse
from app.services.anthropic_client import get_anthropic_client
from app.services.learning_path_prompts import LEARNING_PATH_SYSTEM_PROMPT, build_user_prompt

MODEL = "claude-sonnet-5"


def generate_learning_path(performance_summary: str) -> LearningPathResponse:
    client = get_anthropic_client()

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=LEARNING_PATH_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(performance_summary)}],
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text")

    try:
        raw = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Claude returned a response that wasn't valid JSON") from exc

    try:
        return LearningPathResponse(**raw)
    except (ValidationError, TypeError) as exc:
        raise ValueError("Claude returned a learning path that didn't match the expected shape") from exc
