"""阶段 1：智能输入网关 — 双轨并跑 + AI 润色"""

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from app.core.pipeline.ingestion import (
    run_track_a,
    run_track_b,
    run_track_b_text,
    run_polish,
)
from app.models.schemas import TrackARequest, TrackBTextRequest, PolishRequest

router = APIRouter()


@router.post("/track-a", summary="轨道 A：启发提问模式（Zero to One）")
async def track_a(request: TrackARequest):
    """用户仅有模糊主题，AI 化身业务顾问搜索背景并生成大纲。"""
    return StreamingResponse(
        run_track_a(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/track-b", summary="轨道 B：文档解析模式（Doc to PPT）")
async def track_b(
    file: UploadFile = File(...),
    audience: str = Form("professional"),
    length: str = Form("standard"),
):
    """用户上传文档（PDF/Word/PPT），AI 化身阅读理解专家进行无损提炼。"""
    content = await file.read()
    return StreamingResponse(
        run_track_b(content, file.filename, audience, length),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/track-b/text", summary="轨道 B：粘贴文本模式")
async def track_b_text(request: TrackBTextRequest):
    """用户直接粘贴参考文本，AI 提炼为结构化大纲。"""
    return StreamingResponse(
        run_track_b_text(request.reference_text, request.audience, request.length),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/polish", summary="AI 润色扩写（轨道 A 辅助）")
async def polish(request: PolishRequest):
    """将简短主题扩写为丰富的需求描述。"""
    return StreamingResponse(
        run_polish(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
