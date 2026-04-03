"""确定性 SVG 模板引擎 — 将元素 JSON + 主题色 → 原生 SVG 代码"""

from html import escape

# 主题色定义（与前端 THEMES 保持同步）
THEMES = {
    "apple-frost": {
        "bg": "#F5F5F7", "surface": "#FFFFFF", "surfaceHighlight": "#F5F5F7",
        "textMain": "#1D1D1F", "textMuted": "#86868B",
        "primary": "#0066CC", "radius": "24",
        "border": "#E5E5E5", "shadow": "0 10px 40px rgba(0,0,0,0.04)",
    },
    "morandi-green": {
        "bg": "#EAECE8", "surface": "#F4F5F3", "surfaceHighlight": "#E2E5E0",
        "textMain": "#4A5348", "textMuted": "#889485",
        "primary": "#6B7C67", "radius": "16",
        "border": "#C5CBC2", "shadow": "0 8px 32px rgba(107,124,103,0.08)",
    },
    "cyber-hacker": {
        "bg": "#0A0A0A", "surface": "#141414", "surfaceHighlight": "#1F1F1F",
        "textMain": "#F3F4F6", "textMuted": "#9CA3AF",
        "primary": "#10B981", "radius": "8",
        "border": "#1F3D32", "shadow": "0 0 30px rgba(16,185,129,0.15)",
    },
}


def _parse_px(val: str | None) -> float:
    """'180px' → 180.0"""
    if not val:
        return 0
    return float(str(val).replace("px", "").replace("%", ""))


def elements_to_svg(elements: list[dict], theme_key: str = "apple-frost") -> str:
    """将元素 JSON 数组转换为完整的 SVG 字符串。"""
    theme = THEMES.get(theme_key, THEMES["apple-frost"])
    parts: list[str] = []

    parts.append(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" '
        'width="1280" height="720" font-family="system-ui, -apple-system, sans-serif">'
    )

    for el in elements:
        el_id = el.get("id", "")
        el_type = el.get("type", "")
        style = el.get("style", {})
        content = el.get("content", "")
        is_bento = el.get("isBentoCard", False)

        top = _parse_px(style.get("top"))
        left = _parse_px(style.get("left"))
        w = _parse_px(style.get("width"))
        h = _parse_px(style.get("height"))

        # ─── 背景 ───
        if el_id == "bg":
            parts.append(f'  <rect x="0" y="0" width="1280" height="720" fill="{theme["bg"]}" />')

        # ─── Bento 卡片背景 ───
        elif is_bento:
            r = theme["radius"]
            parts.append(
                f'  <rect x="{left}" y="{top}" width="{w}" height="{h}" rx="{r}" '
                f'fill="{theme["surface"]}" stroke="{theme["border"]}" stroke-width="1" />'
            )

        # ─── 分割线 ───
        elif el_id.startswith("divider_"):
            parts.append(
                f'  <line x1="{left}" y1="{top}" x2="{left + w}" y2="{top}" '
                f'stroke="{theme["surfaceHighlight"]}" stroke-width="1" />'
            )

        # ─── 文本元素 ───
        elif el_type == "text" and content:
            font_size = _parse_px(style.get("fontSize")) or 18
            font_weight = style.get("fontWeight", "normal")
            line_height = float(style.get("lineHeight", "1.4"))
            text_align = style.get("textAlign", "left")
            max_width = w if w > 0 else 1100

            # 确定颜色
            if el_id == "header_title":
                color = theme["textMain"]
            elif el_id == "header_subtitle" or el_id.startswith("info_"):
                color = theme["textMuted"]
            elif el_id.endswith("_num"):
                color = theme["primary"]
            elif el_id.endswith("_title"):
                color = theme["textMain"]
            elif el_id.endswith("_desc"):
                color = theme["textMuted"]
            else:
                color = theme["textMain"]

            # 序号徽章：加背景矩形
            if el_id.endswith("_num"):
                badge_w = font_size * 2.5
                badge_h = font_size * 2
                parts.append(
                    f'  <rect x="{left}" y="{top}" width="{badge_w}" height="{badge_h}" '
                    f'rx="{min(12, float(theme["radius"]))}" fill="{theme["surfaceHighlight"]}" />'
                )
                parts.append(
                    f'  <text x="{left + badge_w / 2}" y="{top + badge_h / 2 + font_size * 0.35}" '
                    f'font-size="{font_size}" font-weight="{font_weight}" fill="{color}" '
                    f'text-anchor="middle">{escape(str(content))}</text>'
                )
            else:
                # 普通文本：使用 foreignObject 支持自动换行
                anchor_x = left
                if text_align == "center" and max_width > 0:
                    anchor_x = left

                parts.append(
                    f'  <foreignObject x="{left}" y="{top}" width="{max_width}" height="{max(font_size * line_height * 5, 100)}">'
                    f'<div xmlns="http://www.w3.org/1999/xhtml" style="'
                    f'font-size:{font_size}px;font-weight:{font_weight};color:{color};'
                    f'line-height:{line_height};text-align:{text_align};word-wrap:break-word;'
                    f'">{escape(str(content))}</div>'
                    f'</foreignObject>'
                )

    parts.append('</svg>')
    return '\n'.join(parts)
