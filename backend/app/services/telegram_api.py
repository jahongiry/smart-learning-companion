"""Small Telegram client. Never expose bot-token URLs in errors or logs."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from app.core.config import settings


class TelegramError(RuntimeError):
    def __init__(self, code=503, retry_after=60):
        super().__init__('Telegram delivery is temporarily unavailable')
        self.code = code
        self.retry_after = min(max(int(retry_after), 1), 86400)


def telegram_call(method: str, payload: dict):
    if not settings.telegram_bot_token:
        raise TelegramError()
    req = Request(f'https://api.telegram.org/bot{settings.telegram_bot_token}/{method}',
                  data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=12) as response:
            data = json.load(response)
    except HTTPError as exc:
        try:
            data = json.loads(exc.read())
        except (ValueError, OSError):
            data = {}
        raise TelegramError(exc.code, data.get('parameters', {}).get('retry_after', 60)) from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise TelegramError() from None
    if not data.get('ok'):
        raise TelegramError(data.get('error_code', 503), data.get('parameters', {}).get('retry_after', 60))
    return data.get('result')


def message(chat_id: int, text: str, **kwargs):
    # Plain text prevents AI content from injecting Telegram formatting or links.
    return {'method': 'sendMessage', 'payload': {'chat_id': chat_id, 'text': text[:4000], **kwargs}}
