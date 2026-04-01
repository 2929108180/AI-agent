"""阶段 3：策划与 Bento Grid 排版骨架"""

from fastapi import APIRouter

from app.core.pipeline.planner import compute_layout
from app.models.schemas import LayoutRequest, LayoutResponse

router = APIRouter()


@router.post("/compute", summary="计算 Bento Grid 排版方案", response_model=LayoutResponse)
async def compute(request: LayoutRequest):
    """为每页分配 Bento Grid 版式，输出坐标区块划分。"""
    return await compute_layout(request)
