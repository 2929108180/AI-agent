"""外部搜索引擎集成"""

import httpx

from app.config import settings


async def web_search(query: str, max_results: int = 5) -> str:
    """调用外部搜索 API 获取背景信息摘要。"""
    # TODO: 对接实际搜索 API（Bing / Serper / SerpAPI）
    # 当前返回占位提示，实际开发时替换
    async with httpx.AsyncClient(timeout=15) as client:
        # 示例：Serper API
        if settings.search_api_key:
            resp = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.search_api_key},
                json={"q": query, "num": max_results},
            )
            data = resp.json()
            snippets = [
                item.get("snippet", "")
                for item in data.get("organic", [])[:max_results]
            ]
            return "\n".join(snippets)

    return f"[搜索暂未配置] 主题: {query}"
