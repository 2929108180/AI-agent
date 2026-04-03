"""阶段 3：幻灯片元素生成 + 上下文感知 AI 编辑 + 动态快捷建议"""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from loguru import logger

from app.core.llm.client import create_llm_client
from app.core.llm.streaming import sse_wrap
from app.core.pipeline.planner import generate_slide_elements
from app.models.schemas import (
    AiEditRequest,
    AiSuggestRequest,
    AiSuggestResponse,
    SlideGenerateRequest,
    SlideGenerateResponse,
)
from app.utils.json_repair import safe_parse_json

router = APIRouter()


@router.post(
    "/generate-slide",
    summary="生成单张幻灯片的元素布局",
    response_model=SlideGenerateResponse,
)
async def generate_slide(request: SlideGenerateRequest):
    """根据大纲卡片数据，生成该页的完整可渲染元素数组。"""
    logger.info(
        f"\n{'='*50}\n"
        f"📥 GENERATE-SLIDE 请求\n"
        f"   slide_id: {request.slide.id}\n"
        f"   type: {request.slide.type}\n"
        f"   title: {request.slide.title[:50]}\n"
        f"   content: {len(request.slide.content)} 个要点\n"
        f"   theme: {request.theme}\n"
        f"{'='*50}"
    )
    result = await generate_slide_elements(request.slide)
    logger.info(
        f"📤 GENERATE-SLIDE 响应 → {len(result.elements)} 个元素\n"
        f"   元素IDs: {[e.id for e in result.elements]}"
    )
    return result


@router.post("/ai-edit", summary="AI 上下文感知元素编辑")
async def ai_edit(request: AiEditRequest):
    """
    选中元素后，AI 基于完整页面上下文改写内容。
    核心原则：不偏离当前主题，除非用户明确要求。
    """

    async def _stream() -> AsyncGenerator[str, None]:
        client = create_llm_client(temperature=0.7)

        # 构建丰富的上下文
        page_context = "\n".join(f"  - {t}" for t in request.all_texts if t.strip()) if request.all_texts else ""

        system_prompt = f"""你是一位为顶级客户服务的 PPT 文案创意总监。

## 你的核心原则
1. **主题一致性**：你的每一次改写都必须紧扣当前幻灯片的主题「{request.slide_title}」，不能偏离、不能跑题。
2. **上下文连贯**：这段文字不是孤立的，它与同一页面上的其他内容共同构成完整的论证。改写后必须与周围内容风格统一、逻辑衔接。
3. **PPT 适配**：输出必须适合 PPT 展示 — 精炼有力，避免长句和复杂从句。
4. **除非用户在指令中明确要求改变方向**，否则你只优化表达，不改变核心含义和论证角度。

## 当前页面上下文
- 页面类型：{request.slide_type}
- 页面主题：{request.slide_title}
- 页面上其他文字：
{page_context}

{f"## 演示策略简报（总体调性参考）{chr(10)}{request.strategy_brief}" if request.strategy_brief else ""}

## 用户指令
{request.instruction}

## 规则
- 直接输出改写后的文本，不要解释、不要加引号
- 保持与页面其他内容的风格一致
- 输出长度适合 PPT 展示（通常 15-60 字，除非指令要求扩展）"""

        user_prompt = f"请改写以下文字：\n{request.element_content}"

        logger.info(
            f"\n{'='*50}\n"
            f"📥 AI-EDIT 请求\n"
            f"   元素: {request.element_id}\n"
            f"   指令: {request.instruction}\n"
            f"   原文: {request.element_content[:100]}\n"
            f"   页面: {request.slide_title} ({request.slide_type})\n"
            f"   上下文文本数: {len(request.all_texts)} 条\n"
            f"   策略简报: {'有' if request.strategy_brief else '无'}\n"
            f"{'='*50}"
        )

        buffer = ""
        async for chunk in sse_wrap(client.stream(system_prompt, user_prompt)):
            if 'data:' in chunk and '"content"' in chunk:
                try:
                    import json as _json
                    data = _json.loads(chunk.split("data: ", 1)[1].strip())
                    buffer += data.get("content", "")
                except Exception:
                    pass
            yield chunk

        logger.info(f"📤 AI-EDIT 输出: {buffer[:200]}{'...' if len(buffer) > 200 else ''}")

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post(
    "/ai-suggest",
    summary="场景化快捷指令（轻量 AI + 规则兜底）",
    response_model=AiSuggestResponse,
)
async def ai_suggest(request: AiSuggestRequest):
    """
    根据选中元素的角色、内容和页面上下文，生成 4 条场景化建议。
    优先用轻量 LLM 调用（max_tokens=100），超时或失败时用规则兜底。
    """
    import asyncio

    logger.info(
        f"💡 AI-SUGGEST 请求 | 元素: {request.element_id} | "
        f"内容: {request.element_content[:60]}... | 页面: {request.slide_title}"
    )

    # 推断角色
    el_id = request.element_id
    content = request.element_content
    slide_type = request.slide_type

    if el_id == "header_title":
        role = "header_title"
    elif el_id == "header_subtitle":
        role = "header_subtitle"
    elif el_id.endswith("_title") and "header" not in el_id:
        role = "card_title"
    elif el_id.endswith("_desc"):
        role = "card_desc"
    elif el_id.endswith("_num"):
        role = "card_num"
    else:
        role = "text"

    # 尝试 LLM（限时 3 秒）
    try:
        suggestions = await asyncio.wait_for(
            _ai_suggest_llm(role, content, request.slide_title, slide_type),
            timeout=3.0,
        )
        if suggestions and len(suggestions) >= 3:
            logger.info(f"📤 AI-SUGGEST 响应 (LLM) | 角色: {role} | 建议: {suggestions[:4]}")
            return AiSuggestResponse(suggestions=suggestions[:4])
    except (asyncio.TimeoutError, Exception) as e:
        logger.warning(f"⚡ AI suggest 超时/失败，回退规则引擎: {e}")

    # 兜底：规则引擎
    fallback = _rule_suggest(role, content, slide_type)
    logger.info(f"📤 AI-SUGGEST 响应 (规则兜底) | 角色: {role} | 建议: {fallback}")
    return AiSuggestResponse(suggestions=fallback)


async def _ai_suggest_llm(role: str, content: str, slide_title: str, slide_type: str) -> list[str]:
    """轻量 LLM 调用生成建议（max_tokens=100，极速返回）。"""
    client = create_llm_client(temperature=0.6, max_tokens=100)

    role_labels = {
        "header_title": "页面主标题", "header_subtitle": "副标题",
        "card_title": "卡片标题", "card_desc": "卡片正文", "card_num": "序号",
    }

    prompt = (
        f"PPT编辑器中，用户选中了一个「{role_labels.get(role, '文本')}」元素。\n"
        f"内容：「{content[:150]}」\n"
        f"所在页面：「{slide_title}」（{slide_type}页）\n\n"
        f"请给出4条针对这段具体内容的编辑建议，每条6-12字。\n"
        f"直接输出JSON数组，如：[\"建议1\",\"建议2\",\"建议3\",\"建议4\"]"
    )

    raw = await client.complete("你是PPT编辑助手。只输出JSON数组，不要其他文字。", prompt)
    parsed = safe_parse_json(raw)

    if isinstance(parsed, list):
        return [str(s) for s in parsed[:4]]
    return []


def _rule_suggest(role: str, content: str, slide_type: str) -> list[str]:
    """规则兜底：按角色 + 内容特征即时返回。"""
    text = (content or "").lower()

    if role == "header_title":
        if slide_type == "cover":
            return ["让标题更有冲击力", "增加品牌记忆点", "改为设问句", "精简为10字以内"]
        elif slide_type == "ending":
            return ["升华为行业愿景", "增加号召力", "改为金句格式", "增加紧迫感"]
        return ["让标题更有冲击力", "改为结论前置句式", "精简为核心论点", "增加数据锚点"]

    elif role == "card_title":
        return ["让关键词更精准", "改为动词开头", "增加行业权威感", "用比喻增强记忆"]

    elif role == "card_desc":
        if any(k in text for k in ["数据", "率", "%", "指标"]):
            return ["让数据更有冲击力", "补充对比基准", "增加趋势描述", "精简为核心数字"]
        elif any(k in text for k in ["技术", "算法", "架构", "系统"]):
            return ["降低术语门槛", "增加商业价值", "补充技术参数", "用类比帮助理解"]
        elif any(k in text for k in ["痛点", "问题", "困难", "挑战"]):
            return ["加强痛感描述", "补充量化损失", "用场景替代抽象", "增加紧迫感"]
        return ["使表达更简洁有力", "补充具体案例", "增加专业权威感", "改为口语化表达"]

    elif role == "header_subtitle":
        return ["增加受众代入感", "补充核心价值主张", "改为引导性问句", "精简为一行"]

    return ["使表达更有力", "精简为核心要点", "补充数据支撑", "调整语气风格"]
