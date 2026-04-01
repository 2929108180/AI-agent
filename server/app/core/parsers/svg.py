"""SVG 校验与修复工具"""

from lxml import etree


def validate_svg(svg_string: str) -> tuple[bool, str]:
    """校验 SVG 字符串是否合法，返回 (是否合法, 错误信息或空)。"""
    try:
        root = etree.fromstring(svg_string.encode("utf-8"))
        if root.tag != "{http://www.w3.org/2000/svg}svg" and root.tag != "svg":
            return False, f"根元素不是 <svg>，而是 <{root.tag}>"
        return True, ""
    except etree.XMLSyntaxError as e:
        return False, str(e)


def extract_svg_viewbox(svg_string: str) -> tuple[int, int, int, int] | None:
    """提取 SVG 的 viewBox 属性。"""
    try:
        root = etree.fromstring(svg_string.encode("utf-8"))
        viewbox = root.get("viewBox")
        if viewbox:
            parts = viewbox.split()
            return tuple(int(float(p)) for p in parts)
    except Exception:
        pass
    return None
