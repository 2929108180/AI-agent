"""阶段 2：大纲重构与逻辑梳理"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.pipeline.architect import generate_outline, refine_outline
from app.models.schemas import OutlineGenerateRequest, OutlineRefineRequest

router = APIRouter()


@router.post("/generate", summary="基于输入生成金字塔结构大纲")
async def generate(request: OutlineGenerateRequest):
    """运用金字塔原理，将信息重构为严格的 JSON 大纲。"""
    return StreamingResponse(
        generate_outline(request),
        media_type="text/event-stream",
    )


@router.post("/refine", summary="用户编辑后重新优化大纲")
async def refine(request: OutlineRefineRequest):
    """用户拖拽/增删便利贴后，AI 重新优化逻辑连贯性。"""
    return StreamingResponse(
        refine_outline(request),
        media_type="text/event-stream",
    )
