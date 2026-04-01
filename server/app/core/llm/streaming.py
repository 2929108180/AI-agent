"""SSE 流式响应工具 — 带生命周期事件"""

import json
from collections.abc import AsyncGenerator


async def sse_event(event: str, data: dict) -> str:
    """构造单条 SSE 事件。"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def sse_wrap(
    generator: AsyncGenerator[str, None],
    event: str = "token",
) -> AsyncGenerator[str, None]:
    """将 token 流包装为 SSE 格式，带生命周期标记。"""
    yield await sse_event("status", {"phase": "generating"})

    async for chunk in generator:
        yield f"event: {event}\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

    yield "event: done\ndata: {}\n\n"
