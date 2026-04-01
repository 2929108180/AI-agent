"""LLM ppt_outline JSON → 前端 SlideCard 扁平数组转换器"""

from app.utils.json_repair import safe_parse_json

SLIDE_COLORS = [
    "bg-amber-100", "bg-blue-100", "bg-green-100",
    "bg-purple-100", "bg-rose-100", "bg-indigo-100",
    "bg-teal-100", "bg-orange-100", "bg-cyan-100",
]


def transform_outline_to_slides(raw_text: str) -> list[dict]:
    """解析 LLM 输出的 ppt_outline JSON，扁平化为前端卡片数组。"""
    parsed = safe_parse_json(raw_text)
    outline = parsed.get("ppt_outline", parsed)

    slides: list[dict] = []
    index = 0

    # 封面
    if cover := outline.get("cover"):
        slides.append({
            "id": f"slide-{index + 1}",
            "title": f"封面：{cover.get('title', '')}",
            "type": "cover",
            "content": [
                f"主标题：{cover.get('title', '')}",
                f"副标题：{cover.get('sub_title', '')}",
                *cover.get("content", []),
            ],
            "visual": "极简设计，品牌标识居中，大字标题",
            "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
        })
        index += 1

    # 目录
    if toc := outline.get("table_of_contents"):
        slides.append({
            "id": f"slide-{index + 1}",
            "title": f"目录：{toc.get('title', '议程概览')}",
            "type": "agenda",
            "content": toc.get("content", []),
            "visual": "编号列表，导航式排版，左侧大号数字",
            "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
        })
        index += 1

    # 各章节页面（扁平展开）
    for part in outline.get("parts", []):
        for page in part.get("pages", []):
            slides.append({
                "id": f"slide-{index + 1}",
                "title": page.get("title", ""),
                "type": "content",
                "content": page.get("content", []),
                "visual": "根据内容自适应 Bento Grid 排版",
                "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
            })
            index += 1

    # 结尾页
    if end := outline.get("end_page"):
        slides.append({
            "id": f"slide-{index + 1}",
            "title": end.get("title", "总结"),
            "type": "ending",
            "content": end.get("content", []),
            "visual": "全屏背景配合大号居中引用文案",
            "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
        })

    return slides
