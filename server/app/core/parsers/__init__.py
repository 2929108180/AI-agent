"""文档解析统一入口"""

from app.core.parsers.pdf import extract_pdf
from app.core.parsers.docx import extract_docx
from app.core.parsers.pptx import extract_pptx


async def parse_document(content: bytes, filename: str) -> str:
    """根据文件扩展名路由到对应解析器。"""
    ext = filename.rsplit(".", 1)[-1].lower()
    match ext:
        case "pdf":
            return extract_pdf(content)
        case "docx" | "doc":
            return extract_docx(content)
        case "pptx" | "ppt":
            return extract_pptx(content)
        case "txt" | "md":
            return content.decode("utf-8")
        case _:
            raise ValueError(f"不支持的文件格式: .{ext}")
