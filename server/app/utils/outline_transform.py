"""LLM ppt_outline JSON → 前端 SlideCard 扁平数组转换器"""

from loguru import logger

from app.utils.json_repair import safe_parse_json

SLIDE_COLORS = [
    "bg-amber-100", "bg-blue-100", "bg-green-100",
    "bg-purple-100", "bg-rose-100", "bg-indigo-100",
    "bg-teal-100", "bg-orange-100", "bg-cyan-100",
]

# 页面类型 → 视觉建议映射（为 Step 3 SVG 渲染提供设计指引）
VISUAL_HINTS = {
    "cover": "极简设计，品牌标识居中，大字标题，背景渐变或暗色调",
    "agenda": "编号列表，导航式排版，左侧大号数字标题，右侧四宫格",
    "ending": "全屏背景配合大号居中引用文案，增加品牌 Logo 与 CTA",
}


def _infer_visual_hint(title: str, content: list[str]) -> str:
    """根据页面标题和内容推断最佳视觉排版建议。"""
    text = title + " ".join(content)

    if any(k in text for k in ["对比", "vs", "VS", "传统"]):
        return "左右对比卡片排版，用色彩区分优劣势"
    if any(k in text for k in ["流程", "步骤", "->", "→", "阶段"]):
        return "水平流程图，节点用圆形图标串联箭头"
    if any(k in text for k in ["数据", "图表", "分布", "曲线", "TDS", "指标", "雷达图"]):
        return "数据可视化为主，大面积图表区 + 右侧关键数字卡片"
    if any(k in text for k in ["三大", "三个", "3个", "突破"]):
        return "三栏等宽 Bento 卡片，每栏一个核心突破点"
    if any(k in text for k in ["案例", "展示", "产品", "界面"]):
        return "左图右文结构，左侧展示界面/产品图，右侧强调数据指标"
    if any(k in text for k in ["痛点", "问题", "挑战"]):
        return "三个带图标的悬浮卡片，阶梯状排列，强调痛感"
    if any(k in text for k in ["生态", "互联", "IoT", "App"]):
        return "中心设备图 + 四周辐射连接的生态图谱"
    if any(k in text for k in ["自定义", "参数", "极客", "高阶"]):
        return "主次结合排版，中央大卡片展示核心参数面板，两侧小卡片展示细节"

    # 默认：根据要点数量选择排版
    n = len(content)
    if n <= 2:
        return "两栏非对称排版，左侧 2/3 大卡片 + 右侧 1/3 辅助信息"
    if n == 3:
        return "三栏均分 Bento 卡片排版，每栏一个核心要点"
    return "顶部英雄式标题 + 下方多卡片网格排版"


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
            "visual": VISUAL_HINTS["cover"],
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
            "visual": VISUAL_HINTS["agenda"],
            "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
        })
        index += 1

    # 各章节页面（扁平展开）
    # 同时递归检查 parts 内是否有被错误嵌套的 end_page
    end_page_data = None

    for part in outline.get("parts", []):
        # 检查 part 本身是否是被误放的 end_page
        if "end_page" in part and "pages" not in part:
            end_page_data = part["end_page"]
            continue

        for page in part.get("pages", []):
            title = page.get("title", "")
            content = page.get("content", [])
            slides.append({
                "id": f"slide-{index + 1}",
                "title": title,
                "type": "content",
                "content": content,
                "visual": _infer_visual_hint(title, content),
                "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
            })
            index += 1

    # 结尾页（优先顶层，其次从 parts 中兜底提取）
    end = outline.get("end_page") or end_page_data
    if end:
        slides.append({
            "id": f"slide-{index + 1}",
            "title": end.get("title", "总结与展望"),
            "type": "ending",
            "content": end.get("content", []),
            "visual": VISUAL_HINTS["ending"],
            "color": SLIDE_COLORS[index % len(SLIDE_COLORS)],
        })

    logger.info(f"🔄 大纲转换: {len(slides)} 张幻灯片 (含封面/目录/结尾)")
    return slides
