from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = (
    Path(__file__).resolve().parents[4]
    if len(Path(__file__).resolve().parents) > 4
    else Path(__file__).resolve().parents[2]
)


class Settings(BaseSettings):
    app_name: str = "OpsHub"
    app_env: str = "development"
    debug: bool = False

    database_url: str

    api_host: str = "127.0.0.1"
    api_port: int = 8000

    secret_key: str
    session_cookie_secure: bool = True
    session_cookie_name: str = "opshub_session"
    csrf_cookie_name: str = "opshub_csrf"
    session_ttl_hours: int = 12
    invitation_ttl_hours: int = 72
    session_cookie_samesite: str = "lax"

    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
