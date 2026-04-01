"""PPTX 导出服务 — 将 SVG 页面打包为可编辑 PPTX"""

import tempfile
from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Emu

from app.models.schemas import ExportRequest


async def export_pptx(request: ExportRequest) -> str:
    """将 SVG 列表写入 PPTX 文件，返回临时文件路径。"""
    prs = Presentation()
    prs.slide_width = Emu(12192000)   # 16:9 宽
    prs.slide_height = Emu(6858000)   # 16:9 高

    blank_layout = prs.slide_layouts[6]  # 空白版式

    for i, svg_code in enumerate(request.pages_svg):
        slide = prs.slides.add_slide(blank_layout)

        # 将 SVG 写入临时文件后作为图片插入
        svg_path = Path(tempfile.mktemp(suffix=".svg"))
        svg_path.write_text(svg_code, encoding="utf-8")

        # python-pptx 1.0+ 支持 SVG 插入
        slide.shapes.add_picture(
            str(svg_path),
            Inches(0), Inches(0),
            prs.slide_width, prs.slide_height,
        )

    output_path = tempfile.mktemp(suffix=".pptx")
    prs.save(output_path)
    return output_path
