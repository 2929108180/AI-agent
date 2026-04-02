"""外部搜索引擎集成 — DuckDuckGo（免费无 Key）+ Serper（可选付费）"""

from loguru import logger

from app.config import settings


async def web_search(query: str, max_results: int = 5) -> str:
    """根据配置的搜索引擎获取背景信息摘要。"""
    engine = settings.search_engine.lower()

    try:
        if engine == "serper" and settings.serper_api_key:
            return await _search_serper(query, max_results)
        else:
            return await _search_duckduckgo(query, max_results)
    except Exception as e:
        logger.warning(f"搜索失败，返回空上下文: {e}")
        return f"[搜索暂不可用] 主题: {query}"


async def _search_duckduckgo(query: str, max_results: int) -> str:
    """DuckDuckGo 搜索 — 免费，无需 API Key。"""
    from duckduckgo_search import AsyncDDGS

    async with AsyncDDGS() as ddgs:
        results = await ddgs.atext(query, max_results=max_results)

    if not results:
        return f"[未找到相关结果] 主题: {query}"

    snippets = []
    for r in results:
        title = r.get("title", "")
        body = r.get("body", "")
        snippets.append(f"- {title}: {body}")

    context = "\n".join(snippets)
    logger.info(f"DuckDuckGo 搜索完成，获取 {len(results)} 条结果")
    return context


async def _search_serper(query: str, max_results: int) -> str:
    """Serper.dev (Google 搜索代理) — 需要 API Key，质量更高。"""
    import httpx

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": settings.serper_api_key},
            json={"q": query, "num": max_results},
        )
        resp.raise_for_status()
        data = resp.json()

    snippets = []
    for item in data.get("organic", [])[:max_results]:
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        snippets.append(f"- {title}: {snippet}")

    context = "\n".join(snippets)
    logger.info(f"Serper 搜索完成，获取 {len(snippets)} 条结果")
    return context
