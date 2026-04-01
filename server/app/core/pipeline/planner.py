"""阶段 3 核心逻辑：Bento Grid 排版引擎"""

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import load_prompt
from app.models.schemas import LayoutRequest, LayoutResponse
from app.utils.json_repair import safe_parse_json


async def compute_layout(request: LayoutRequest) -> LayoutResponse:
    """为单页内容计算 Bento Grid 排版方案。"""
    client = create_llm_client(temperature=0.4)

    bento_rules = load_prompt("2_bento_grid")

    system_prompt = (
        "你是一位精通 Bento Grid 排版的设计工程师。根据页面内容，输出最佳的卡片布局 JSON。\n\n"
        f"排版规则：\n{bento_rules}\n\n"
        "输出格式：\n"
        '{"cards": [{"id": "c1", "x": 0, "y": 0, "w": 600, "h": 300, "role": "title"}, ...]}'
    )
    user_prompt = f"页面内容：\n{request.page_content_json}"

    raw = await client.complete(system_prompt, user_prompt)
    layout = safe_parse_json(raw)

    return LayoutResponse(cards=layout.get("cards", []))
