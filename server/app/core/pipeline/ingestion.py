"""阶段 1 核心逻辑：智能输入网关 — 双轨并跑 + AI 润色"""

import json
from collections.abc import AsyncGenerator

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import render_prompt
from app.core.llm.streaming import sse_event, sse_wrap
from app.core.parsers import parse_document
from app.models.schemas import TrackARequest, PolishRequest
from app.services.search import web_search
from app.utils.outline_transform import transform_outline_to_slides


async def run_track_a(request: TrackARequest) -> AsyncGenerator[str, None]:
    """轨道 A：启发提问模式 — 搜索背景 + 流式生成大纲 + 结构化转换。"""
    client = create_llm_client()

    try:
        # 1. 搜索背景
        yield await sse_event("status", {"phase": "searching"})
        context = await web_search(request.topic)

        # 2. 组装 Prompt 1-A，流式生成
        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1a_architect_zero", CONTEXT=context)
        user_prompt = (
            f"主题: {request.topic}\n受众: {request.audience}\n篇幅: {request.length}"
        )

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # 3. 解析转换为前端卡片格式
        slides = transform_outline_to_slides(buffer)
        yield f"event: outline\ndata: {json.dumps({'slides': slides}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_track_b(
    file_content: bytes,
    filename: str,
    audience: str,
    length: str,
) -> AsyncGenerator[str, None]:
    """轨道 B（文件上传）：解析文档 + 流式生成大纲 + 结构化转换。"""
    client = create_llm_client()

    try:
        # 1. 解析文档
        yield await sse_event("status", {"phase": "parsing"})
        text = await parse_document(file_content, filename)

        # 2. 流式生成
        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1b_architect_doc", USER_DOCUMENT=text)
        user_prompt = f"受众: {audience}\n篇幅: {length}"

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # 3. 转换
        slides = transform_outline_to_slides(buffer)
        yield f"event: outline\ndata: {json.dumps({'slides': slides}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_track_b_text(
    reference_text: str,
    audience: str,
    length: str,
) -> AsyncGenerator[str, None]:
    """轨道 B（粘贴文本）：直接用文本走 Doc-to-PPT 管道。"""
    client = create_llm_client()

    try:
        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1b_architect_doc", USER_DOCUMENT=reference_text)
        user_prompt = f"受众: {audience}\n篇幅: {length}"

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        slides = transform_outline_to_slides(buffer)
        yield f"event: outline\ndata: {json.dumps({'slides': slides}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_polish(request: PolishRequest) -> AsyncGenerator[str, None]:
    """AI 润色扩写 — 将简短主题扩展为丰富的需求描述。"""
    client = create_llm_client()

    try:
        system_prompt = (
            "你是一位专业的演示文稿需求分析师。用户给出了一个简短的 PPT 主题描述，"
            "请帮助他扩写、润色成一段更丰富、更具体的需求描述（约 150-300 字），"
            "补充可能的核心卖点、目标受众关注点、数据支撑方向。"
            "直接输出润色后的文本，不要加任何标签或解释。"
        )
        user_prompt = f"原始主题：{request.topic}\n目标受众：{request.audience}"

        async for chunk in sse_wrap(client.stream(system_prompt, user_prompt)):
            yield chunk

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
