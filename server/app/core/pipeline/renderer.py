"""阶段 4 核心逻辑：SVG 设计稿渲染器"""

import json
from collections.abc import AsyncGenerator

from loguru import logger

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import load_prompt
from app.core.llm.streaming import sse_event
from app.models.schemas import SlideCard
from app.utils.svg_utils import wrap_svg_page, strip_svg_tags
from app.core.parsers.svg import validate_svg

# 主题调色板
THEME_PALETTES = {
    "apple-frost": """
主色: #0066CC (Apple蓝)  背景: #F5F5F7→#EBEDF0渐变  卡片: #FFFFFF
文字主色: #1D1D1F  文字辅色: #86868B  强调色: #FF3B30
卡片阴影: rgba(0,0,0,0.04)  圆角: 20-24px  风格: 极简克制、苹果质感""",
    "morandi-green": """
主色: #6B7C67 (莫兰迪绿)  背景: #EAECE8→#E2E5E0渐变  卡片: #F4F5F3
文字主色: #4A5348  文字辅色: #889485  强调色: #D4A373
卡片阴影: rgba(107,124,103,0.08)  圆角: 16px  风格: 温润典雅、艺术气息""",
    "cyber-hacker": """
主色: #10B981 (赛博绿)  背景: #0A0A0A→#111827渐变  卡片: #141414
文字主色: #F3F4F6  文字辅色: #9CA3AF  强调色: #8B5CF6
卡片阴影: rgba(16,185,129,0.15)  圆角: 8px  风格: 暗黑科技、荧光发光""",
}


async def render_slide_svg(
    slide: SlideCard,
    theme: str = "apple-frost",
) -> AsyncGenerator[str, None]:
    """为单张幻灯片生成完整 SVG 设计稿（SSE 流式）。"""
    client = create_llm_client(temperature=0.5)

    palette = THEME_PALETTES.get(theme, THEME_PALETTES["apple-frost"])
    svg_prompt = load_prompt("3_svg_renderer")

    # 组装页面内容
    content_lines = "\n".join(f"- {item}" for item in slide.content)
    page_content = f"标题: {slide.title}\n\n要点:\n{content_lines}"

    if slide.visual:
        page_content += f"\n\n视觉建议: {slide.visual}"

    # 替换模板变量
    system_prompt = svg_prompt.replace("{{THEME_PALETTE}}", palette)
    system_prompt = system_prompt.replace("{{PAGE_TYPE}}", slide.type)
    system_prompt = system_prompt.replace("{{PAGE_CONTENT}}", page_content)

    logger.info(
        f"\n{'='*50}\n"
        f"🎨 SVG 设计稿渲染\n"
        f"   slide: {slide.id} | type: {slide.type}\n"
        f"   title: {slide.title[:50]}\n"
        f"   theme: {theme}\n"
        f"   content: {len(slide.content)} 个要点\n"
        f"{'='*50}"
    )

    try:
        yield await sse_event("status", {"phase": "rendering"})

        buffer = ""
        async for chunk in client.stream(system_prompt, "请生成这一页的完整 SVG 设计稿。"):
            buffer += chunk
            yield f"event: svg_chunk\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # 清理和验证 SVG
        svg_code = strip_svg_tags(buffer)
        svg_code = wrap_svg_page(svg_code)

        is_valid, error = validate_svg(svg_code)
        if not is_valid:
            logger.warning(f"⚠️ SVG 校验失败: {error}")

        logger.info(f"✅ SVG 渲染完成 ({len(svg_code)} 字)")

        yield f"event: svg_complete\ndata: {json.dumps({'svg': svg_code}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        logger.error(f"❌ SVG 渲染异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
