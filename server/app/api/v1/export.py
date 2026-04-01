"""导出服务 — PDF / PPTX / PNG"""

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.models.schemas import ExportRequest
from app.services.export import export_pptx

router = APIRouter()


@router.post("/pptx", summary="导出为 PPTX 文件")
async def to_pptx(request: ExportRequest):
    """将 SVG 页面集合打包为可编辑的 PPTX 文件。"""
    path = await export_pptx(request)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="presentation.pptx",
    )
