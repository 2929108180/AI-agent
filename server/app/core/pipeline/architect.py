"""阶段 2 核心逻辑：大纲架构师"""

from collections.abc import AsyncGenerator

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import render_prompt
from app.core.llm.streaming import sse_wrap
from app.models.schemas import OutlineGenerateRequest, OutlineRefineRequest


async def generate_outline(request: OutlineGenerateRequest) -> AsyncGenerator[str, None]:
    """基于输入数据生成金字塔结构大纲。"""
    client = create_llm_client()

    system_prompt = render_prompt("1a_architect_zero", CONTEXT=request.context or "")
    user_prompt = (
        f"主题: {request.topic}\n受众: {request.audience}\n篇幅: {request.length}\n"
        f"补充信息: {request.extra or ''}"
    )

    async for chunk in sse_wrap(client.stream(system_prompt, user_prompt)):
        yield chunk


async def refine_outline(request: OutlineRefineRequest) -> AsyncGenerator[str, None]:
    """用户修改便利贴后，重新优化大纲的逻辑连贯性。"""
    client = create_llm_client()

    system_prompt = (
        "你是一位 PPT 大纲优化专家。用户已手动调整了大纲结构（拖拽、增删、改写），"
        "请在保持用户意图的前提下，优化逻辑连贯性和层次感。"
        "输出格式与原大纲完全一致的 JSON。"
    )
    user_prompt = f"当前大纲 JSON:\n{request.outline_json}\n\n用户修改说明: {request.instruction or '请优化'}"

    async for chunk in sse_wrap(client.stream(system_prompt, user_prompt)):
        yield chunk
