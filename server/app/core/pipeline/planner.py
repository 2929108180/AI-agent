"""阶段 3 核心逻辑：幻灯片元素生成 + Bento Grid 排版引擎"""

import json

from loguru import logger

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import load_prompt
from app.models.schemas import SlideCard, SlideElement, SlideGenerateResponse
from app.utils.json_repair import safe_parse_json


# ─── 固定模板：cover / agenda / ending ───

def _generate_cover(slide: SlideCard) -> list[dict]:
    """封面页：大标题居中 + 副标题 + 信息行。"""
    logger.info(f"   📐 模板生成: cover | title={slide.title[:40]}")
    title = slide.title.replace("封面：", "")
    # 从 content 提取副标题和信息
    subtitle = ""
    info_lines = []
    for item in slide.content:
        if item.startswith("副标题："):
            subtitle = item.replace("副标题：", "")
        elif item.startswith("主标题："):
            continue  # 跳过重复的主标题
        else:
            info_lines.append(item)

    elements = [
        {"id": "bg", "type": "box", "style": {"width": "100%", "height": "100%", "position": "absolute", "zIndex": "0"}},
        {"id": "header_title", "type": "text", "content": title,
         "style": {"fontSize": "56px", "fontWeight": "800", "position": "absolute",
                   "top": "220px", "left": "120px", "width": "1040px", "zIndex": "1", "lineHeight": "1.2"}},
    ]
    if subtitle:
        elements.append(
            {"id": "header_subtitle", "type": "text", "content": subtitle,
             "style": {"fontSize": "24px", "fontWeight": "500", "position": "absolute",
                       "top": "340px", "left": "120px", "width": "1040px", "zIndex": "1"}}
        )
    # 信息行
    for i, line in enumerate(info_lines[:2]):
        elements.append(
            {"id": f"info_{i+1}", "type": "text", "content": line,
             "style": {"fontSize": "16px", "fontWeight": "normal", "position": "absolute",
                       "top": f"{440 + i * 32}px", "left": "120px", "zIndex": "1"}}
        )
    return elements


def _generate_agenda(slide: SlideCard) -> list[dict]:
    """目录页：左侧大号数字 + 右侧标题列表。"""
    logger.info(f"   📐 模板生成: agenda | {len(slide.content)} 项")
    elements = [
        {"id": "bg", "type": "box", "style": {"width": "100%", "height": "100%", "position": "absolute", "zIndex": "0"}},
        {"id": "header_title", "type": "text", "content": "目录",
         "style": {"fontSize": "48px", "fontWeight": "800", "position": "absolute",
                   "top": "40px", "left": "60px", "zIndex": "1"}},
    ]
    start_y = 160
    item_height = 80
    for i, item in enumerate(slide.content):
        num_y = start_y + i * item_height
        # 数字
        elements.append(
            {"id": f"card{i+1}_num", "type": "text", "content": f"0{i+1}",
             "style": {"fontSize": "36px", "fontWeight": "800", "position": "absolute",
                       "top": f"{num_y}px", "left": "80px", "zIndex": "1"}}
        )
        # 标题
        elements.append(
            {"id": f"card{i+1}_title", "type": "text", "content": item,
             "style": {"fontSize": "22px", "fontWeight": "500", "position": "absolute",
                       "top": f"{num_y + 8}px", "left": "160px", "width": "1000px", "zIndex": "1"}}
        )
        # 分割线
        if i < len(slide.content) - 1:
            elements.append(
                {"id": f"divider_{i+1}", "type": "box",
                 "style": {"position": "absolute", "top": f"{num_y + 65}px", "left": "160px",
                           "width": "1000px", "height": "1px", "zIndex": "1"}}
            )
    return elements


def _generate_ending(slide: SlideCard) -> list[dict]:
    """结尾页：大号居中引言 + CTA。"""
    logger.info(f"   📐 模板生成: ending | {len(slide.content)} 行")
    title = slide.title
    elements = [
        {"id": "bg", "type": "box", "style": {"width": "100%", "height": "100%", "position": "absolute", "zIndex": "0"}},
        {"id": "header_title", "type": "text", "content": title,
         "style": {"fontSize": "48px", "fontWeight": "800", "position": "absolute",
                   "top": "180px", "left": "120px", "width": "1040px", "textAlign": "center",
                   "zIndex": "1"}},
    ]
    start_y = 320
    for i, item in enumerate(slide.content):
        elements.append(
            {"id": f"card{i+1}_desc", "type": "text", "content": item,
             "style": {"fontSize": "20px", "fontWeight": "normal", "position": "absolute",
                       "top": f"{start_y + i * 50}px", "left": "160px", "width": "960px",
                       "textAlign": "center", "lineHeight": "1.6", "zIndex": "1"}}
        )
    return elements


# ─── AI 驱动：content 页 Bento Grid 布局 ───

async def _generate_content_ai(slide: SlideCard, layout_history: list[str] | None = None) -> list[dict]:
    """内容页：调用 LLM 生成 Bento Grid 元素数组。"""
    logger.info(f"   🤖 AI Bento Grid 生成: {len(slide.content)} 个要点 | visual: {slide.visual[:50]}")
    client = create_llm_client(temperature=0.7)
    bento_prompt = load_prompt("2_bento_grid")

    user_data = {
        "title": slide.title,
        "content": slide.content,
        "visual_hint": slide.visual,
        "content_count": len(slide.content),
    }

    # 告诉 LLM 前面已经用过哪些布局，避免重复
    if layout_history:
        user_data["avoid_layouts"] = f"前面几页已经使用过以下布局风格，请这一页换一种不同的：{', '.join(layout_history[-3:])}"

    user_input = json.dumps(user_data, ensure_ascii=False)

    raw = await client.complete(bento_prompt, user_input)
    logger.info(f"🎨 Bento Grid LLM 输出 ({len(raw)} 字):\n{raw[:500]}...")

    # 解析 JSON 元素数组
    parsed = safe_parse_json(raw)
    if isinstance(parsed, list):
        return parsed
    elif isinstance(parsed, dict) and "elements" in parsed:
        return parsed["elements"]
    else:
        # 兜底：如果 LLM 输出不合格，用确定性模板
        logger.warning("⚠️ LLM Bento Grid 输出格式异常，使用兜底模板")
        return _generate_content_fallback(slide)


def _generate_content_fallback(slide: SlideCard) -> list[dict]:
    """内容页兜底模板：根据要点数量选择固定布局。"""
    n = len(slide.content)
    elements = [
        {"id": "bg", "type": "box", "style": {"width": "100%", "height": "100%", "position": "absolute", "zIndex": "0"}},
        {"id": "header_title", "type": "text", "content": slide.title,
         "style": {"fontSize": "48px", "fontWeight": "800", "position": "absolute",
                   "top": "40px", "left": "60px", "zIndex": "1"}},
    ]

    # 预定义布局坐标
    if n <= 2:
        cards = [
            {"top": 140, "left": 60, "w": 700, "h": 520},
            {"top": 140, "left": 780, "w": 440, "h": 520},
        ]
    elif n == 3:
        cards = [
            {"top": 140, "left": 60, "w": 560, "h": 520},
            {"top": 140, "left": 640, "w": 580, "h": 250},
            {"top": 410, "left": 640, "w": 580, "h": 250},
        ]
    elif n == 4:
        cards = [
            {"top": 140, "left": 60, "w": 570, "h": 250},
            {"top": 140, "left": 650, "w": 570, "h": 250},
            {"top": 410, "left": 60, "w": 570, "h": 250},
            {"top": 410, "left": 650, "w": 570, "h": 250},
        ]
    else:
        cards = [
            {"top": 140, "left": 60, "w": 560, "h": 520},
            {"top": 140, "left": 640, "w": 290, "h": 250},
            {"top": 140, "left": 950, "w": 270, "h": 250},
            {"top": 410, "left": 640, "w": 290, "h": 250},
            {"top": 410, "left": 950, "w": 270, "h": 250},
        ]

    for i, item in enumerate(slide.content[:len(cards)]):
        c = cards[i]
        # 拆分 "关键词：说明" 格式
        if "：" in item:
            keyword, desc = item.split("：", 1)
        elif ":" in item:
            keyword, desc = item.split(":", 1)
        else:
            keyword, desc = "", item

        idx = i + 1
        elements.append(
            {"id": f"card{idx}_bg", "type": "box", "isBentoCard": True,
             "style": {"position": "absolute", "top": f"{c['top']}px", "left": f"{c['left']}px",
                       "width": f"{c['w']}px", "height": f"{c['h']}px", "zIndex": "1"}}
        )
        elements.append(
            {"id": f"card{idx}_num", "type": "text", "content": str(idx),
             "style": {"fontSize": "24px", "fontWeight": "bold", "borderRadius": "16px",
                       "padding": "12px 24px", "position": "absolute",
                       "top": f"{c['top'] + 30}px", "left": f"{c['left'] + 30}px", "zIndex": "2"}}
        )
        elements.append(
            {"id": f"card{idx}_title", "type": "text", "content": keyword or f"要点 {idx}",
             "style": {"fontSize": "32px", "fontWeight": "bold", "position": "absolute",
                       "top": f"{c['top'] + 30}px", "left": f"{c['left'] + 100}px", "zIndex": "2"}}
        )
        elements.append(
            {"id": f"card{idx}_desc", "type": "text", "content": desc.strip() if desc else item,
             "style": {"fontSize": "18px", "position": "absolute",
                       "top": f"{c['top'] + 80}px", "left": f"{c['left'] + 30}px",
                       "width": f"{c['w'] - 60}px", "lineHeight": "1.6", "zIndex": "2"}}
        )

    return elements


# ─── 统一入口 ───

async def generate_slide_elements(slide: SlideCard) -> SlideGenerateResponse:
    """根据幻灯片类型选择生成策略，返回元素数组。"""
    slide_type = slide.type.lower()

    logger.info(
        f"🎬 生成幻灯片元素 | id={slide.id} type={slide_type} "
        f"title={slide.title[:30]}... content={len(slide.content)} 个要点"
    )

    match slide_type:
        case "cover":
            elements = _generate_cover(slide)
        case "agenda":
            elements = _generate_agenda(slide)
        case "ending":
            elements = _generate_ending(slide)
        case _:  # content, showcase 等都走 AI 布局
            elements = await _generate_content_ai(slide)

    logger.info(f"✅ 元素生成完成: {len(elements)} 个元素")
    return SlideGenerateResponse(elements=[SlideElement(**e) for e in elements])
