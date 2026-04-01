"""Word 文档文本提取 — 基于 python-docx"""

import io

from docx import Document


def extract_docx(content: bytes) -> str:
    """从 Word 文档中提取全部段落文本。"""
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)
