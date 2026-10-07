from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173"
    anthropic_api_key: str | None = None
    turnstile_enabled: bool = False
    turnstile_site_key: str = ""
    turnstile_secret_key: str = ""
    turnstile_hostnames: str = ""
    telegram_enabled: bool = False
    telegram_process_inline: bool = True
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_secret: str = ""
    cron_secret: str = ""
    telegram_daily_question_limit: int = 30
    frontend_url: str = "https://smart-learning-companion-frontend.vercel.app"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
