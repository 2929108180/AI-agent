"""导出服务 — PPTX"""

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.models.schemas import ExportRequest
from app.services.export import export_pptx

router = APIRouter()


@router.post("/pptx", summary="导出为 PPTX 文件")
async def to_pptx(request: ExportRequest):
    """将所有幻灯片的元素数据打包为可编辑的 PPTX 文件。"""
    path = await export_pptx(request)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=f"{request.filename}.pptx",
    )
