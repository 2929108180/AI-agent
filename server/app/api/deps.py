from app.core.llm.client import LLMProvider, create_llm_client
from app.config import settings


async def get_llm_client() -> LLMProvider:
    return create_llm_client()
