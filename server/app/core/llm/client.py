"""LLM 客户端抽象层 — 策略模式统一 OpenAI / Grok / Gemini 调用接口"""

import abc
from collections.abc import AsyncGenerator

from app.config import settings


class LLMProvider(abc.ABC):
    """所有 LLM 供应商的基类。"""

    def __init__(self, model: str, temperature: float, max_tokens: int):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    @abc.abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """非流式调用，返回完整文本。"""

    @abc.abstractmethod
    async def stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        """流式调用，逐 token 产出。"""


class OpenAICompatibleProvider(LLMProvider):
    """覆盖 OpenAI 和 xAI Grok（同 SDK，仅 base_url 不同）。"""

    def __init__(
        self,
        model: str,
        temperature: float,
        max_tokens: int,
        api_key: str,
        base_url: str | None = None,
    ):
        super().__init__(model, temperature, max_tokens)
        from openai import AsyncOpenAI

        kwargs: dict = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self._client = AsyncOpenAI(**kwargs)

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        resp = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        return resp.choices[0].message.content

    async def stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        stream = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


class GeminiProvider(LLMProvider):
    """Google Gemini via google-genai SDK。"""

    def __init__(self, model: str, temperature: float, max_tokens: int, api_key: str):
        super().__init__(model, temperature, max_tokens)
        from google import genai

        self._client = genai.Client(api_key=api_key)

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        from google.genai import types

        response = await self._client.aio.models.generate_content(
            model=self.model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=self.temperature,
                max_output_tokens=self.max_tokens,
            ),
        )
        return response.text

    async def stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        from google.genai import types

        async for chunk in self._client.aio.models.generate_content_stream(
            model=self.model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=self.temperature,
                max_output_tokens=self.max_tokens,
            ),
        ):
            if chunk.text:
                yield chunk.text


def create_llm_client(
    provider: str | None = None,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> LLMProvider:
    """工厂函数 — 根据配置返回对应 LLM 供应商实例。"""
    p = provider or settings.llm_provider
    m = model or settings.llm_model
    t = temperature if temperature is not None else settings.llm_temperature
    mt = max_tokens or settings.llm_max_tokens

    match p:
        case "openai":
            return OpenAICompatibleProvider(m, t, mt, api_key=settings.openai_api_key)
        case "grok":
            return OpenAICompatibleProvider(
                m, t, mt,
                api_key=settings.grok_api_key,
                base_url="https://api.x.ai/v1",
            )
        case "gemini":
            return GeminiProvider(m, t, mt, api_key=settings.gemini_api_key)
        case _:
            raise ValueError(f"Unsupported LLM provider: {p}")
