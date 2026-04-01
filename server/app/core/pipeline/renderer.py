"""阶段 4 核心逻辑：SVG 代码生成"""

from collections.abc import AsyncGenerator

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import render_prompt
from app.core.llm.streaming import sse_wrap
from app.models.schemas import RenderRequest


async def render_svg(request: RenderRequest) -> AsyncGenerator[str, None]:
    """结合文案与排版骨架，生成整页原生 SVG。"""
    client = create_llm_client(temperature=0.3)

    bento_logic = render_prompt("2_bento_grid")
    system_prompt = render_prompt(
        "3_svg_renderer",
        BENTO_GRID_LOGIC=bento_logic,
        PAGE_CONTENT=request.page_content,
    )
    user_prompt = f"布局骨架 JSON:\n{request.layout_json}\n\n请生成 SVG 代码。"

    async for chunk in sse_wrap(client.stream(system_prompt, user_prompt), event="svg"):
        yield chunk
