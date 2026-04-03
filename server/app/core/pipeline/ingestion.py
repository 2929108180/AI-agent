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

# 篇幅 → 页数映射
LENGTH_MAP = {
    "short": "5-8",
    "standard": "12-15",
    "long": "20-30",
    "conference": "35-45",
}

# 用户手选受众时的调性引导（仅作为策略简报的补充输入）
AUDIENCE_HINT = {
    "professional": "受众是专业同行/专家，偏好技术深度、严谨论证、行业术语。",
    "investor": "受众是投资人/高管，关注ROI、市场规模、增长数据，结论前置。",
    "consumer": "受众是大众消费者，偏好情绪共鸣、生活场景、'对我有什么好处'。",
    "internal": "受众是内部团队，偏好操作清晰、流程步骤化、交付物明确。",
}

STRATEGY_BRIEF_PROMPT = """你是一位顶级商业PPT策划公司的首席策略师（收费1万+/页那种）。

你的任务是：深度阅读用户提供的原始素材，输出一份 **演示策略简报（Presentation Strategy Brief）**。
这份简报将直接指导后续的PPT大纲架构师工作。

请从以下维度分析并输出（直接输出简报内容，不要加标题或解释）：

1. **项目本质**（一句话概括这份材料的核心是什么）
2. **目标受众画像**（谁会看这个PPT？他们的决策关注点是什么？他们的知识背景？）
3. **核心说服逻辑**（应该用什么逻辑链条说服受众？先讲什么后讲什么？）
4. **关键数据/事实锚点**（材料中哪些数据点最有冲击力，必须在PPT中突出？）
5. **情绪曲线设计**（演示过程中受众的情绪应该怎么变化？在哪里制造高潮？）
6. **风险规避**（有哪些内容可能引起受众质疑？如何提前化解？）
7. **视觉风格建议**（基于内容特质，推荐什么设计调性？数据密集型/故事型/技术架构型？）

要求：
- 简报总长度 300-500 字
- 必须基于原始素材的实际内容分析，不要泛泛而谈
- 如果素材中有具体数据、产品名、客户名，必须在简报中引用"""


def _build_audience_hint(audience: str, custom_audience: str = "", custom_audience_note: str = "") -> str:
    """构建受众提示：支持预设 + 自定义 + auto。"""
    parts = []

    # 预设受众
    if audience != "auto" and audience in AUDIENCE_HINT:
        parts.append(AUDIENCE_HINT[audience])

    # 自定义受众
    if custom_audience.strip():
        parts.append(f"用户自定义的汇报对象：「{custom_audience}」")
        if custom_audience_note.strip():
            parts.append(f"用户补充说明：{custom_audience_note}")

    return "\n".join(parts)


async def _generate_strategy_brief(client, text: str, audience_hint: str = "") -> str:
    """AI 深度分析材料，生成定制化演示策略简报。"""
    user_input = text[:6000]  # 取前6000字，足够分析核心内容
    if audience_hint:
        user_input = f"[用户指定的受众偏好：{audience_hint}]\n\n{user_input}"

    brief = await client.complete(STRATEGY_BRIEF_PROMPT, user_input)
    logger.info(f"📋 策略简报生成完成 ({len(brief)} 字):\n{brief}")
    return brief


async def run_track_a(request: TrackARequest) -> AsyncGenerator[str, None]:
    """轨道 A：启发提问模式 — 搜索 + 策略分析 + 流式生成大纲。"""
    client = create_llm_client()
    page_range = LENGTH_MAP.get(request.length, "12-15")

    logger.info(
        f"\n{'─'*50}\n"
        f"🚀 TRACK A 启动\n"
        f"   主题: {request.topic}\n"
        f"   受众: {request.audience}\n"
        f"   自定义受众: {request.custom_audience or '(无)'}\n"
        f"   自定义说明: {request.custom_audience_note[:80] or '(无)'}\n"
        f"   篇幅: {request.length} ({page_range} 页)\n"
        f"   LLM: {client.model}\n"
        f"{'─'*50}"
    )

    try:
        # 1. 搜索背景
        yield await sse_event("status", {"phase": "searching"})
        context = await web_search(request.topic)
        logger.info(f"🔍 搜索结果:\n{context[:500]}{'...' if len(context) > 500 else ''}")

        # 2. 策略分析（Track A 用搜索结果 + 主题作为素材）
        yield await sse_event("status", {"phase": "analyzing"})
        analysis_material = f"主题描述：{request.topic}\n\n搜索到的背景信息：\n{context}"
        audience_hint = _build_audience_hint(request.audience, request.custom_audience, request.custom_audience_note)
        strategy_brief = await _generate_strategy_brief(client, analysis_material, audience_hint)

        # 3. 组装 Prompt，流式生成大纲
        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1a_architect_zero", CONTEXT=context, STRATEGY_BRIEF=strategy_brief)
        user_prompt = (
            f"主题: {request.topic}\n"
            f"篇幅要求: 总共 {page_range} 页（含封面、目录、结尾页）"
        )

        logger.info(
            f"📝 SYSTEM PROMPT (前500字):\n{system_prompt[:500]}...\n"
            f"📝 USER PROMPT:\n{user_prompt}"
        )

        buffer = ""
        async for chunk in client.stream(system_prompt, user_prompt):
            buffer += chunk
            yield f"event: token\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        logger.info(f"🤖 LLM 原始输出 ({len(buffer)} 字):\n{buffer}")

        # 4. 解析转换
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
    supplementary_text: str = "",
    custom_audience: str = "",
    custom_audience_note: str = "",
) -> AsyncGenerator[str, None]:
    """轨道 B（文件上传）：解析 → 策略分析 → 流式生成大纲。"""
    client = create_llm_client()
    page_range = LENGTH_MAP.get(length, "12-15")

    logger.info(
        f"\n{'─'*50}\n"
        f"🚀 TRACK B (文件上传) 启动\n"
        f"   文件: {filename} ({len(file_content)} bytes)\n"
        f"   补充文本: {len(supplementary_text)} 字\n"
        f"   受众: {audience} | 篇幅: {length} ({page_range} 页)\n"
        f"   自定义受众: {custom_audience or '(无)'}\n"
        f"   自定义说明: {custom_audience_note[:80] or '(无)'}\n"
        f"{'─'*50}"
    )

    try:
        # 1. 解析文档
        yield await sse_event("status", {"phase": "parsing"})
        text = await parse_document(file_content, filename)
        if supplementary_text.strip():
            text = text + "\n\n--- 用户补充说明 ---\n" + supplementary_text.strip()
        logger.info(f"📄 文档解析完成 ({len(text)} 字):\n{text[:500]}{'...' if len(text) > 500 else ''}")

        # 2. AI 策略分析
        yield await sse_event("status", {"phase": "analyzing"})
        audience_hint = _build_audience_hint(audience, custom_audience, custom_audience_note)
        strategy_brief = await _generate_strategy_brief(client, text, audience_hint)

        # 3. 流式生成大纲（策略简报注入 Prompt）        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1b_architect_doc", USER_DOCUMENT=text, STRATEGY_BRIEF=strategy_brief)
        user_prompt = f"篇幅要求: 总共 {page_range} 页（含封面、目录、结尾页）"

        logger.info(f"📝 USER PROMPT:\n{user_prompt}")

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
        logger.error(f"❌ TRACK B 异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def run_track_b_text(
    reference_text: str,
    audience: str,
    length: str,
) -> AsyncGenerator[str, None]:
    """轨道 B（粘贴文本）：策略分析 → 流式生成大纲。"""
    client = create_llm_client()
    page_range = LENGTH_MAP.get(length, "12-15")

    logger.info(
        f"\n{'─'*50}\n"
        f"🚀 TRACK B (粘贴文本) 启动\n"
        f"   文本长度: {len(reference_text)} 字\n"
        f"   受众: {audience} | 篇幅: {length} ({page_range} 页)\n"
        f"{'─'*50}"
    )

    try:
        # 策略分析
        yield await sse_event("status", {"phase": "analyzing"})
        audience_hint = _build_audience_hint(audience)
        strategy_brief = await _generate_strategy_brief(client, reference_text, audience_hint)

        # 流式生成
        yield await sse_event("status", {"phase": "generating"})
        system_prompt = render_prompt("1b_architect_doc", USER_DOCUMENT=reference_text, STRATEGY_BRIEF=strategy_brief)
        user_prompt = f"篇幅要求: 总共 {page_range} 页（含封面、目录、结尾页）"

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
    """AI 润色扩写 — 支持指令式二次润色。"""
    client = create_llm_client()

    instruction = request.instruction
    logger.info(
        f"✨ POLISH 启动 | 文本长度: {len(request.topic)} 字 | "
        f"受众: {request.audience} | 指令: {instruction or '默认扩写'}"
    )

    try:
        if instruction:
            system_prompt = (
                "你是一位专业的演示文稿文案优化师。用户已有一段 PPT 需求描述，"
                f"请根据以下指令对其进行调整：【{instruction}】\n\n"
                "规则：\n"
                "- 直接输出调整后的完整文本，不要解释你做了什么\n"
                "- 保持核心信息不变，只调整表达方式/详略程度/语气\n"
                "- 输出长度根据指令灵活调整（'更精简'时缩短，'更详尽'时扩展）"
            )
        else:
            system_prompt = (
                "你是一位专业的演示文稿需求分析师。用户给出了一段 PPT 主题描述，"
                "请帮助他扩写、润色成一段更丰富、更具体的需求描述（约 150-300 字），"
                "补充可能的核心卖点、目标受众关注点、数据支撑方向。"
                "直接输出润色后的文本，不要加任何标签或解释。"
            )

        user_prompt = f"原始文本：{request.topic}\n目标受众：{request.audience}"

        async for chunk in sse_wrap(client.stream(system_prompt, user_prompt)):
            yield chunk

    except Exception as e:
        logger.error(f"❌ POLISH 异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
