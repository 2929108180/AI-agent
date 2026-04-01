"""阶段 4：矢量设计与 SVG 代码渲染"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.pipeline.renderer import render_svg
from app.models.schemas import RenderRequest

router = APIRouter()


@router.post("/svg", summary="生成单页 SVG 代码")
async def svg(request: RenderRequest):
    """结合文案与排版骨架，生成整页原生 SVG 代码。"""
    return StreamingResponse(
        render_svg(request),
        media_type="text/event-stream",
    )
