"""Run from backend/ after setting the server-only environment variables.

This configures only the explicitly supplied bot, never prints its token, and
refuses to replace another application's webhook.
"""
import argparse
import sys
from pathlib import Path
from urllib.parse import urlparse
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import settings
from app.services.telegram_api import TelegramError, telegram_call


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--webhook-url', required=True)
    parser.add_argument('--check', action='store_true', help='Read status without changing bot settings')
    args = parser.parse_args()
    parsed = urlparse(args.webhook_url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query:
        parser.error('Use a public HTTPS webhook URL without credentials or a query string.')
    if not all((settings.telegram_bot_token, settings.telegram_bot_username, settings.telegram_webhook_secret, settings.cron_secret)):
        parser.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET and CRON_SECRET first.')
    if not (16 <= len(settings.telegram_webhook_secret) <= 256) or any(
            not (c.isascii() and (c.isalnum() or c in '_-')) for c in settings.telegram_webhook_secret):
        parser.error('Use a webhook secret of 16–256 ASCII letters, numbers, underscores or hyphens.')
    bot = telegram_call('getMe', {})
    if bot.get('username', '').lower() != settings.telegram_bot_username.lower():
        parser.error('Bot username and token do not match.')
    info = telegram_call('getWebhookInfo', {})
    print(f"Bot: @{bot['username']}")
    print(f"Expected webhook configured: {info.get('url') == args.webhook_url}")
    print(f"Pending updates: {info.get('pending_update_count', 0)}")
    print(f"Recent webhook error: {bool(info.get('last_error_date'))}")
    if args.check:
        return
    if info.get('url') and info['url'] != args.webhook_url:
        parser.error('This bot already has another webhook. Use a dedicated new bot to avoid disrupting it.')
    telegram_call('setWebhook', {'url': args.webhook_url, 'secret_token': settings.telegram_webhook_secret,
                               'allowed_updates': ['message', 'callback_query'], 'max_connections': 5})
    telegram_call('setMyCommands', {'commands': [
        {'command': 'help', 'description': 'How to use your learning tutor'},
        {'command': 'stop', 'description': 'Pause daily quizzes and facts'},
        {'command': 'resume', 'description': 'Resume daily quizzes and facts'},
        {'command': 'disconnect', 'description': 'Disconnect your website account'},
    ]})
    print('Webhook and commands configured. Enable the worker scheduler before connecting users.')


if __name__ == '__main__':
    try:
        main()
    except TelegramError as exc:
        sys.exit(f'Telegram configuration failed (HTTP {exc.code}). Check the server-only settings.')
