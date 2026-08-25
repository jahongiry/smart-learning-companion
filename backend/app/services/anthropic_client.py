from functools import lru_cache

import anthropic

from app.core.config import settings


@lru_cache
def get_anthropic_client() -> anthropic.Anthropic:
    api_key = (settings.anthropic_api_key or "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set. Add it to backend/.env to enable quiz generation.")
    return anthropic.Anthropic(api_key=api_key)
