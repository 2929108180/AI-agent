"""阶段 4：SVG 设计稿渲染"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.pipeline.renderer import render_slide_svg
from app.models.schemas import SlideCard

router = APIRouter()


class RenderSlideRequest(BaseModel):
    """SVG 设计稿渲染请求。"""
    slide: SlideCard
    theme: str = "apple-frost"


@router.post("/svg", summary="生成单页 SVG 设计稿")
async def render_svg(request: RenderSlideRequest):
    """将幻灯片内容渲染为完整的 SVG 设计稿（SSE 流式）。"""
    return StreamingResponse(
        render_slide_svg(request.slide, request.theme),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
