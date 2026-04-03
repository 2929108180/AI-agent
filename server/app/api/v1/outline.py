"""阶段 2：大纲生成 + 深度充实 + 结构优化 + 多轮访谈"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.pipeline.architect import generate_outline, refine_outline
from app.core.pipeline.enricher import (
    enrich_outline,
    enrich_single_slide,
    generate_interview_questions,
    optimize_outline,
)
from app.models.schemas import (
    OutlineGenerateRequest,
    OutlineRefineRequest,
    OutlineEnrichRequest,
    OutlineEnrichSingleRequest,
    OutlineOptimizeRequest,
    InterviewStartRequest,
)

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


@router.post("/optimize", summary="AI 优化大纲结构（调骨架）")
async def optimize(request: OutlineOptimizeRequest):
    """
    不推翻整套大纲，在当前结果上做结构重组：
    - 调整章节顺序
    - 合并/拆分页面
    - 重写页面标题
    - 调整要点归属
    """
    return StreamingResponse(
        optimize_outline(request.slides, request.instruction, request.strategy_brief),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/enrich", summary="逐页深度检索充实大纲内容")
async def enrich(request: OutlineEnrichRequest):
    """对大纲的每一页独立搜索、AI 充实，输出饱满的专业内容。"""
    return StreamingResponse(
        enrich_outline(request.slides, request.strategy_brief),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/enrich-single", summary="单页深度充实")
async def enrich_single(request: OutlineEnrichSingleRequest):
    """只充实指定的一页，返回充实后的 slide 数据。"""
    result = await enrich_single_slide(request.slide, request.strategy_brief)
    return result


@router.post("/interview", summary="Track A 多轮访谈（生成问题）")
async def interview_start(request: InterviewStartRequest):
    """AI 搜索背景后生成针对性问题，开启需求调研对话。"""
    return StreamingResponse(
        generate_interview_questions(request.topic),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
