import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import Header, HTTPException

from app.core.config import settings


def captcha_configuration() -> dict:
    if not settings.turnstile_enabled:
        return {"enabled": False, "site_key": None}
    if not (
        settings.turnstile_site_key.strip()
        and settings.turnstile_secret_key.strip()
        and any(host.strip() for host in settings.turnstile_hostnames.split(","))
    ):
        raise HTTPException(503, "Security verification is unavailable. Please try again later.")
    return {"enabled": True, "site_key": settings.turnstile_site_key.strip()}


def verify_captcha(token: str | None, action: str) -> None:
    if not captcha_configuration()["enabled"]:
        return
    if not token or not token.strip() or len(token) > 2048:
        raise HTTPException(403, "Please complete the security check and try again.")

    request = Request(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data=json.dumps({"secret": settings.turnstile_secret_key.strip(), "response": token}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
    except (URLError, OSError, ValueError) as exc:
        # Never log the request, secret, or token. Provider failures must not bypass the check.
        raise HTTPException(503, "Security verification is unavailable. Please try again.") from exc

    if not isinstance(result, dict):
        raise HTTPException(503, "Security verification is unavailable. Please try again.")
    allowed_hosts = {host.strip().lower() for host in settings.turnstile_hostnames.split(",") if host.strip()}
    if (
        result.get("success") is not True
        or result.get("action") != action
        or not isinstance(result.get("hostname"), str)
        or result.get("hostname") not in allowed_hosts
    ):
        raise HTTPException(403, "Security check failed or expired. Please try again.")


def require_captcha(action: str):
    def dependency(x_turnstile_token: str | None = Header(default=None)) -> None:
        verify_captcha(x_turnstile_token, action)

    return dependency
