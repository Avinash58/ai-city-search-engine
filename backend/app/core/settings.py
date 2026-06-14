from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # CORS
    CORS_ALLOW_ORIGINS: list[str] = ["*"]

    # Database
    DATABASE_URL: str = "postgresql+psycopg://cityai:cityai_password@localhost:5432/cityai_db"

    # JWT
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Elasticsearch
    ELASTIC_URL: str = "http://localhost:9200"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Geoapify
    GEOAPIFY_API_KEY: str = "d0b5bbfc7d804645ad5c760516e30726"

    # Gemini AI
    GEMINI_API_KEY: str = ""


    # Google Places API
    GOOGLE_PLACES_API_KEY: str = ""

    # OpenRouter API
    OPENROUTER_API_KEY: str = ""

settings = Settings()
