"""SVG 通用工具函数"""

import re


def wrap_svg_page(svg_content: str, width: int = 1280, height: int = 720) -> str:
    """确保 SVG 具有正确的 viewBox 和命名空间。"""
    if 'viewBox' not in svg_content:
        svg_content = svg_content.replace(
            '<svg',
            f'<svg viewBox="0 0 {width} {height}"',
            1,
        )
    if 'xmlns' not in svg_content:
        svg_content = svg_content.replace(
            '<svg',
            '<svg xmlns="http://www.w3.org/2000/svg"',
            1,
        )
    return svg_content


def strip_svg_tags(text: str) -> str:
    """从 LLM 输出中提取纯 SVG 代码（去除 markdown 代码块）。"""
    text = text.strip()
    text = re.sub(r'^```(?:svg|xml)?\s*\n?', '', text)
    text = re.sub(r'\n?```\s*$', '', text)
    return text.strip()
