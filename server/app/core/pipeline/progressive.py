"""渐进式全流程管道：充实 → 策划稿 → 设计稿，完成一页推送一页"""

import asyncio
import json
from collections.abc import AsyncGenerator

from loguru import logger

from app.core.llm.client import create_llm_client
from app.core.llm.prompts import load_prompt
from app.core.pipeline.planner import generate_slide_elements
from app.core.pipeline.renderer import THEME_PALETTES
from app.models.schemas import SlideCard
from app.services.search import web_search
from app.utils.json_repair import safe_parse_json
from app.utils.svg_utils import wrap_svg_page, strip_svg_tags

# 滑动窗口并发数：始终保持 N 个页面在同时处理
CONCURRENCY = 2


class PipelineCancelled(Exception):
    pass


async def run_progressive_pipeline(
    slides: list[SlideCard],
    theme: str = "apple-frost",
    strategy_brief: str = "",
    skip_enrich: bool = False,
    skip_design: bool = False,
    skip_enrich_indices: list[int] | None = None,
    cancel_event: asyncio.Event | None = None,
) -> AsyncGenerator[str, None]:
    """
    滑动窗口并发：始终保持 CONCURRENCY 个页面在处理，
    每完成一页立刻推送并补入下一页。
    """
    total = len(slides)
    _skip_set = set(skip_enrich_indices or [])

    logger.info(
        f"\n{'='*60}\n"
        f"🚀 渐进式管道启动（滑动窗口，concurrency={CONCURRENCY}）\n"
        f"   总页数: {total} | 主题: {theme}\n"
        f"   跳过充实: {skip_enrich} | 跳过设计稿: {skip_design}\n"
        f"   按页跳过充实: {sorted(_skip_set)}\n"
        f"{'='*60}"
    )

    yield _sse("pipeline_start", {"total": total, "theme": theme})

    # 所有 slide_start 先发出去
    for i, s in enumerate(slides):
        yield _sse("slide_start", {
            "index": i, "total": total,
            "title": s.title, "type": s.type,
        })

    # 结果队列：worker 完成后放入，主循环立即消费推送
    queue: asyncio.Queue = asyncio.Queue()
    next_index = 0  # 下一个要启动的页码
    active_tasks: set[asyncio.Task] = set()
    completed = 0

    async def _worker(idx: int):
        """处理单页，完成后放入队列。"""
        try:
            result = await _process_slide(
                idx, slides[idx], theme, strategy_brief,
                skip_enrich=skip_enrich or (idx in _skip_set),
                skip_design=skip_design,
                cancel_event=cancel_event,
            )
            await queue.put(("ok", idx, result))
        except PipelineCancelled:
            await queue.put(("cancelled", idx, None))
        except Exception as e:
            logger.error(f"   ❌ [{idx+1}/{total}] 异常: {e}")
            await queue.put(("error", idx, None))

    def _start_next():
        """启动下一个 worker（如果还有页面待处理）。"""
        nonlocal next_index
        if next_index < total:
            task = asyncio.create_task(_worker(next_index))
            active_tasks.add(task)
            task.add_done_callback(active_tasks.discard)
            next_index += 1

    # 初始填满窗口
    for _ in range(min(CONCURRENCY, total)):
        _start_next()

    # 主循环：消费队列，即时推送，补入新任务
    while completed < total:
        if cancel_event and cancel_event.is_set():
            for t in active_tasks:
                t.cancel()
            logger.info("🛑 管道被用户取消")
            yield _sse("pipeline_cancelled", {"completed": completed})
            return

        status, idx, result = await queue.get()
        completed += 1

        if status == "cancelled":
            for t in active_tasks:
                t.cancel()
            logger.info("🛑 管道被用户取消")
            yield _sse("pipeline_cancelled", {"completed": completed})
            return

        if status == "error" or result is None:
            yield _sse("slide_complete", {
                "index": idx, "total": total,
                "title": slides[idx].title,
                "slide": slides[idx].model_dump(),
                "elements": [], "svg": "",
            })
        else:
            enriched, elements, svg = result

            yield _sse("slide_enriched", {"index": idx, "slide": enriched.model_dump()})
            yield _sse("slide_layout", {"index": idx, "elements": elements})
            yield _sse("slide_complete", {
                "index": idx, "total": total,
                "title": enriched.title,
                "slide": enriched.model_dump(),
                "elements": elements, "svg": svg,
            })

        logger.info(f"   📤 [{idx+1}/{total}] 推送完成 ({completed}/{total})")

        # 补入下一页
        _start_next()

    yield _sse("pipeline_complete", {"total": total})
    yield "event: done\ndata: {}\n\n"
    logger.info(f"🏁 管道完成: {total} 页")


async def _process_slide(
    index: int, slide: SlideCard, theme: str, brief: str,
    skip_enrich: bool, skip_design: bool,
    cancel_event: asyncio.Event | None = None,
) -> tuple[SlideCard, list[dict], str]:

    label = f"[{index+1}]"
    simple = slide.type in ("cover", "agenda", "ending")

    def _ck():
        if cancel_event and cancel_event.is_set():
            raise PipelineCancelled()

    # 充实
    enriched = slide
    if not skip_enrich and not simple:
        _ck()
        try:
            c = await _enrich(slide, brief)
            enriched = SlideCard(**{**slide.model_dump(), "content": c})
            logger.info(f"   ✅ {label} 充实: {len(slide.content)}→{len(c)}")
        except PipelineCancelled:
            raise
        except Exception as e:
            logger.warning(f"   ⚠️ {label} 充实失败: {e}")
    else:
        logger.info(f"   ⏭️ {label} 跳过充实")

    # 策划稿
    _ck()
    elements: list[dict] = []
    try:
        r = await generate_slide_elements(enriched)
        elements = [e.model_dump() for e in r.elements]
        logger.info(f"   ✅ {label} 策划稿: {len(elements)} 元素")
    except PipelineCancelled:
        raise
    except Exception as e:
        logger.error(f"   ❌ {label} 策划稿失败: {e}")

    # 设计稿
    svg = ""
    if not skip_design:
        _ck()
        try:
            svg = await _render(enriched, theme)
            logger.info(f"   ✅ {label} 设计稿: {len(svg)} 字")
        except PipelineCancelled:
            raise
        except Exception as e:
            logger.error(f"   ❌ {label} 设计稿失败: {e}")

    return enriched, elements, svg


async def _enrich(slide: SlideCard, brief: str) -> list[str]:
    client = create_llm_client(temperature=0.5)
    q = f"{slide.title} {' '.join(slide.content[:2])}"
    res = await web_search(q, max_results=3)
    p = f"""你是一位顶级 PPT 内容策划师。将空洞的要点充实为有数据、有案例的专业内容。
每个要点 30-60 字，可扩展到 4-5 个。
{f"策略简报：{brief[:300]}" if brief else ""}
直接输出 JSON 数组：["要点1", ...]"""
    raw = await client.complete(p,
        f"标题: {slide.title}\n要点:\n{json.dumps(slide.content, ensure_ascii=False)}\n\n搜索:\n{res}")
    parsed = safe_parse_json(raw)
    return [str(x) for x in parsed] if isinstance(parsed, list) else slide.content


async def _render(slide: SlideCard, theme: str) -> str:
    client = create_llm_client(temperature=0.5)
    palette = THEME_PALETTES.get(theme, THEME_PALETTES["apple-frost"])
    tmpl = load_prompt("3_svg_renderer")
    lines = "\n".join(f"- {x}" for x in slide.content)
    page = f"标题: {slide.title}\n\n要点:\n{lines}"
    if slide.visual:
        page += f"\n\n视觉建议: {slide.visual}"
    sys = tmpl.replace("{{THEME_PALETTE}}", palette).replace("{{PAGE_TYPE}}", slide.type).replace("{{PAGE_CONTENT}}", page)
    raw = await client.complete(sys, "请生成这一页的完整 SVG 设计稿。")
    return wrap_svg_page(strip_svg_tags(raw))


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
