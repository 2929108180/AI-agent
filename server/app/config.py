from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM
    openai_api_key: str = ""
    grok_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "openai"  # openai | grok | gemini
    llm_model: str = "gpt-4o"
    llm_base_url: str = ""  # 自定义 API 地址（中转站），留空则用官方默认
    llm_temperature: float = 0.7
    llm_max_tokens: int = 4096

    # Search
    search_engine: str = "duckduckgo"  # duckduckgo | serper
    serper_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173"]
    debug: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
