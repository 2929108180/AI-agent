"""阶段 1 核心逻辑：智能输入网关 — 双轨并跑 + AI 润色"""

import json
from collections.abc import AsyncGenerator

from loguru import logger

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

    logger.info(
        f"\n{'─'*50}\n"
        f"🚀 TRACK A 启动\n"
        f"   主题: {request.topic}\n"
        f"   受众: {request.audience}\n"
        f"   篇幅: {request.length}\n"
        f"   LLM: {client.model}\n"
        f"{'─'*50}"
    )

    try:
        # 1. 搜索背景
        yield await sse_event("status", {"phase": "searching"})
        context = await web_search(request.topic)
        logger.info(f"🔍 搜索结果:\n{context[:500]}{'...' if len(context) > 500 else ''}")

        # 页数映射
        length_map = {"short": "5-8", "standard": "12-15", "long": "20-30"}
        page_range = length_map.get(request.length, "12-15")

        # 2. 组装 Prompt 1-A，流式生成
        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1a_architect_zero", CONTEXT=context)
        user_prompt = (
            f"主题: {request.topic}\n受众: {request.audience}\n"
            f"篇幅要求: 总共 {page_range} 页（含封面、目录、结尾页）"
        )

        logger.info(
            f"📝 SYSTEM PROMPT (前300字):\n{system_prompt[:300]}...\n"
            f"📝 USER PROMPT:\n{user_prompt}"
        )

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        logger.info(f"🤖 LLM 原始输出 ({len(buffer)} 字):\n{buffer}")

        # 3. 解析转换为前端卡片格式
        slides = transform_outline_to_slides(buffer)
        logger.info(
            f"📊 转换结果: {len(slides)} 张幻灯片\n"
            f"{json.dumps(slides, ensure_ascii=False, indent=2)}"
        )

        yield f"event: outline\ndata: {json.dumps({'slides': slides}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        logger.error(f"❌ TRACK A 异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_track_b(
    file_content: bytes,
    filename: str,
    audience: str,
    length: str,
) -> AsyncGenerator[str, None]:
    """轨道 B（文件上传）：解析文档 + 流式生成大纲 + 结构化转换。"""
    client = create_llm_client()

    logger.info(
        f"\n{'─'*50}\n"
        f"🚀 TRACK B (文件上传) 启动\n"
        f"   文件: {filename} ({len(file_content)} bytes)\n"
        f"   受众: {audience} | 篇幅: {length}\n"
        f"{'─'*50}"
    )

    try:
        # 1. 解析文档
        yield await sse_event("status", {"phase": "parsing"})
        text = await parse_document(file_content, filename)
        logger.info(f"📄 文档解析完成 ({len(text)} 字):\n{text[:500]}{'...' if len(text) > 500 else ''}")

        # 2. 流式生成
        length_map = {"short": "5-8", "standard": "12-15", "long": "20-30"}
        page_range = length_map.get(length, "12-15")

        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1b_architect_doc", USER_DOCUMENT=text)
        user_prompt = f"受众: {audience}\n篇幅要求: 总共 {page_range} 页（含封面、目录、结尾页）"

        logger.info(f"📝 USER PROMPT:\n{user_prompt}")

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        logger.info(f"🤖 LLM 原始输出 ({len(buffer)} 字):\n{buffer}")

        # 3. 转换
        slides = transform_outline_to_slides(buffer)
        logger.info(f"📊 转换结果: {len(slides)} 张幻灯片\n{json.dumps(slides, ensure_ascii=False, indent=2)}")

        yield f"event: outline\ndata: {json.dumps({'slides': slides}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        logger.error(f"❌ TRACK B 异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_track_b_text(
    reference_text: str,
    audience: str,
    length: str,
) -> AsyncGenerator[str, None]:
    """轨道 B（粘贴文本）：直接用文本走 Doc-to-PPT 管道。"""
    client = create_llm_client()

    logger.info(
        f"\n{'─'*50}\n"
        f"🚀 TRACK B (粘贴文本) 启动\n"
        f"   文本长度: {len(reference_text)} 字\n"
        f"   受众: {audience} | 篇幅: {length}\n"
        f"   文本预览: {reference_text[:200]}...\n"
        f"{'─'*50}"
    )

    try:
        length_map = {"short": "5-8", "standard": "12-15", "long": "20-30"}
        page_range = length_map.get(length, "12-15")

        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1b_architect_doc", USER_DOCUMENT=reference_text)
        user_prompt = f"受众: {audience}\n篇幅要求: 总共 {page_range} 页（含封面、目录、结尾页）"

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        logger.info(f"🤖 LLM 原始输出 ({len(buffer)} 字):\n{buffer}")

        slides = transform_outline_to_slides(buffer)
        logger.info(f"📊 转换结果: {len(slides)} 张幻灯片\n{json.dumps(slides, ensure_ascii=False, indent=2)}")

        yield f"event: outline\ndata: {json.dumps({'slides': slides}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        logger.error(f"❌ TRACK B TEXT 异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_polish(request: PolishRequest) -> AsyncGenerator[str, None]:
    """AI 润色扩写 — 将简短主题扩展为丰富的需求描述。"""
    client = create_llm_client()

    logger.info(f"✨ POLISH 启动 | 主题: {request.topic} | 受众: {request.audience}")

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
        logger.error(f"❌ POLISH 异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
