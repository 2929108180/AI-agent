"""渐进式全流程管道 API"""

import uuid
import asyncio

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from loguru import logger

from app.core.pipeline.progressive import run_progressive_pipeline
from app.models.schemas import ProgressivePipelineRequest

router = APIRouter()

# 全局取消信号注册表
_cancel_signals: dict[str, asyncio.Event] = {}


@router.post("/run", summary="渐进式全流程管道（充实→策划稿→设计稿）")
async def run_pipeline(request: ProgressivePipelineRequest):
    """
    对每张幻灯片依次执行：深度充实 → 策划稿 → 设计稿。
    每完成一步就通过 SSE 推送，前端可立即展示。
    返回 header 中包含 X-Pipeline-Id，前端用它来调用 /stop。
    """
    pipeline_id = str(uuid.uuid4())[:8]
    cancel_event = asyncio.Event()
    _cancel_signals[pipeline_id] = cancel_event

    logger.info(
        f"\n{'='*60}\n"
        f"PIPELINE API 请求 | id={pipeline_id}\n"
        f"   slides: {len(request.slides)}\n"
        f"   theme: {request.theme}\n"
        f"   skip_enrich: {request.skip_enrich}\n"
        f"   skip_design: {request.skip_design}\n"
        f"   skip_enrich_indices: {request.skip_enrich_indices}\n"
        f"{'='*60}"
    )

    async def _stream_with_cleanup():
        try:
            async for chunk in run_progressive_pipeline(
                slides=request.slides,
                theme=request.theme,
                strategy_brief=request.strategy_brief,
                skip_enrich=request.skip_enrich,
                skip_design=request.skip_design,
                skip_enrich_indices=request.skip_enrich_indices,
                cancel_event=cancel_event,
            ):
                yield chunk
        finally:
            _cancel_signals.pop(pipeline_id, None)
            logger.info(f"🧹 管道 {pipeline_id} 清理完成")

    return StreamingResponse(
        _stream_with_cleanup(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Pipeline-Id": pipeline_id,
        },
    )


@router.post("/stop", summary="停止正在运行的管道")
async def stop_pipeline(pipeline_id: str = ""):
    """
    立即中止指定管道的所有 LLM 调用。
    如果不传 pipeline_id，则停止所有正在运行的管道。
    """
    if pipeline_id and pipeline_id in _cancel_signals:
        _cancel_signals[pipeline_id].set()
        logger.info(f"🛑 管道 {pipeline_id} 已收到停止信号")
        return {"status": "stopped", "pipeline_id": pipeline_id}

    if not pipeline_id:
        count = len(_cancel_signals)
        for pid, event in _cancel_signals.items():
            event.set()
            logger.info(f"🛑 管道 {pid} 已收到停止信号")
        return {"status": "stopped_all", "count": count}

    return {"status": "not_found", "pipeline_id": pipeline_id}
