import json

from pydantic import ValidationError

from app.schemas.topic import TopicExplainResponse
from app.services.anthropic_client import get_anthropic_client
from app.services.topic_prompts import TOPIC_SYSTEM_PROMPT, build_user_prompt

MODEL = "claude-sonnet-5"


def explain_topic(subject: str, topic: str, year_level: str) -> TopicExplainResponse:
    client = get_anthropic_client()

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=TOPIC_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(subject, topic, year_level)}],
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text")

    try:
        raw = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Claude returned a response that wasn't valid JSON") from exc

    try:
        return TopicExplainResponse(**raw)
    except (ValidationError, TypeError) as exc:
        raise ValueError("Claude returned an explanation that didn't match the expected shape") from exc
