"""PDF 文本提取 — 基于 PyMuPDF"""

import io

import fitz  # pymupdf


def extract_pdf(content: bytes) -> str:
    """从 PDF 中提取全部文本内容。"""
    doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n\n".join(pages)
