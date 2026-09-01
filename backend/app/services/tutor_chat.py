from app.schemas.tutor import ChatMessage
from app.services.anthropic_client import get_anthropic_client

MODEL = "claude-sonnet-5"
MAX_HISTORY_MESSAGES = 20


def get_tutor_reply(system_prompt: str, messages: list[ChatMessage]) -> str:
    client = get_anthropic_client()
    trimmed = messages[-MAX_HISTORY_MESSAGES:]

    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=system_prompt,
        messages=[{"role": m.role, "content": m.content} for m in trimmed],
    )

    return "".join(block.text for block in response.content if block.type == "text")
