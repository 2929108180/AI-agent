"""阶段 2 扩展：大纲逐页深度检索充实 + 多轮访谈"""

import json
from collections.abc import AsyncGenerator

from loguru import logger

from app.core.llm.client import create_llm_client
from app.core.llm.streaming import sse_event
from app.models.schemas import SlideCard
from app.services.search import web_search


async def enrich_outline(
    slides: list[SlideCard],
    strategy_brief: str = "",
) -> AsyncGenerator[str, None]:
    """逐页深度检索 + AI 充实，将空洞的大纲要点变为饱满的专业内容。"""
    client = create_llm_client(temperature=0.5)
    total = len(slides)

    logger.info(
        f"\n{'='*50}\n"
        f"📚 大纲逐页深度充实启动\n"
        f"   总页数: {total}\n"
        f"   策略简报: {'有' if strategy_brief else '无'}\n"
        f"{'='*50}"
    )

    enriched_slides: list[dict] = []

    for i, slide in enumerate(slides):
        slide_type = slide.type

        # 封面、目录、结尾页不需要深度充实
        if slide_type in ("cover", "agenda", "ending"):
            enriched_slides.append(slide.model_dump())
            yield await sse_event("enrich_progress", {
                "index": i,
                "total": total,
                "status": "skipped",
                "title": slide.title,
                "slide": slide.model_dump(),
            })
            logger.info(f"   ⏭️ [{i+1}/{total}] 跳过: {slide.title[:30]} ({slide_type})")
            continue

        # ─── 内容页：深度充实 ───
        yield await sse_event("enrich_progress", {
            "index": i,
            "total": total,
            "status": "searching",
            "title": slide.title,
        })

        # 1. 以页面标题+要点为关键词搜索
        search_query = f"{slide.title} {' '.join(slide.content[:2])}"
        logger.info(f"   🔍 [{i+1}/{total}] 搜索: {search_query[:60]}...")

        search_results = await web_search(search_query, max_results=3)

        yield await sse_event("enrich_progress", {
            "index": i,
            "total": total,
            "status": "enriching",
            "title": slide.title,
        })

        # 2. AI 基于搜索结果充实内容
        system_prompt = f"""你是一位顶级 PPT 内容策划师。你的任务是将一页 PPT 的空洞要点，充实为饱满、专业、有说服力的内容。

## 你的输入
- 页面标题和当前要点（比较空洞）
- 针对该页面的搜索结果（真实数据）
{f"- 演示策略简报（总体调性参考）：{strategy_brief[:500]}" if strategy_brief else ""}

## 你的任务
将每个要点从"一句话概括"扩展为"有数据、有案例、有对比"的专业内容：

1. **补充具体数据**：从搜索结果中提取真实数字（市场规模、增长率、占比等）
2. **增加行业案例**：引用搜索结果中的真实公司、产品、事件
3. **加入对比论证**：与竞品/行业标准/历史数据对比，增强说服力
4. **保持 PPT 适配**：每个要点仍然精炼（30-60字），但信息密度大幅提高

## 输出格式
输出 JSON 数组，每个元素是一个充实后的要点字符串。要点数量可以比原来多（原来3个可以扩展到4-5个）。
直接输出 JSON 数组，不要加其他文字：
["充实后的要点1", "充实后的要点2", "充实后的要点3", "充实后的要点4"]"""

        user_prompt = f"""页面标题: {slide.title}

当前要点（需要充实）:
{json.dumps(slide.content, ensure_ascii=False, indent=2)}

搜索到的参考资料:
{search_results}"""

        raw = await client.complete(system_prompt, user_prompt)
        logger.info(f"   📝 [{i+1}/{total}] AI 充实输出: {raw[:200]}...")

        # 3. 解析充实后的内容
        try:
            from app.utils.json_repair import safe_parse_json
            parsed = safe_parse_json(raw)
            if isinstance(parsed, list):
                enriched_content = [str(item) for item in parsed]
            else:
                enriched_content = slide.content  # 解析失败，保持原样
        except Exception:
            enriched_content = slide.content

        # 4. 构建充实后的 slide
        enriched_slide = slide.model_dump()
        enriched_slide["content"] = enriched_content

        enriched_slides.append(enriched_slide)

        yield await sse_event("enrich_progress", {
            "index": i,
            "total": total,
            "status": "done",
            "title": slide.title,
            "slide": enriched_slide,
        })

        logger.info(
            f"   ✅ [{i+1}/{total}] 充实完成: {slide.title[:30]} "
            f"({len(slide.content)} → {len(enriched_content)} 个要点)"
        )

    # 全部完成，发送完整的充实后大纲
    yield f"event: enrich_complete\ndata: {json.dumps({'slides': enriched_slides}, ensure_ascii=False)}\n\n"
    yield "event: done\ndata: {}\n\n"

    logger.info(f"📚 大纲充实全部完成: {total} 页")


async def generate_interview_questions(topic: str) -> AsyncGenerator[str, None]:
    """Track A 多轮访谈：AI 搜索背景后生成针对性问题。"""
    client = create_llm_client(temperature=0.6)

    logger.info(f"🎤 访谈启动 | 主题: {topic}")

    try:
        # 1. 先搜索背景
        yield await sse_event("status", {"phase": "searching"})
        context = await web_search(topic, max_results=5)

        logger.info(f"🔍 访谈背景搜索完成:\n{context[:300]}...")

        # 2. AI 基于背景生成问题
        yield await sse_event("status", {"phase": "generating"})

        system_prompt = """你是一位专业的 PPT 需求调研顾问。用户给了一个 PPT 主题，你已经搜索了相关背景资料。

现在你需要像一位顶级咨询师那样，提出 4-5 个精准的问题来帮助用户理清 PPT 需求。

## 提问原则
1. **受众定位**：这份 PPT 是给谁看的？他们最关心什么？
2. **核心目标**：这次演示要达到什么目的？（说服投资？培训团队？推销产品？）
3. **关键卖点**：你最想传达的 2-3 个核心信息是什么？
4. **差异化**：与竞品/现有方案相比，最大的不同是什么？
5. **约束条件**：有没有必须包含的内容？有没有不能提的？

## 输出格式
输出 JSON 数组，每个元素是一个问题对象：
[
  {"id": "q1", "question": "问题内容", "hint": "帮助用户回答的提示", "type": "text"},
  {"id": "q2", "question": "问题内容", "hint": "提示", "type": "select", "options": ["选项1", "选项2", "选项3"]}
]

type 可以是 "text"（开放问答）或 "select"（给选项）。
直接输出 JSON，不要其他文字。"""

        user_prompt = f"PPT 主题：{topic}\n\n搜索到的背景资料：\n{context}"

        raw = await client.complete(system_prompt, user_prompt)
        logger.info(f"🎤 访谈问题生成: {raw[:300]}...")

        from app.utils.json_repair import safe_parse_json
        questions = safe_parse_json(raw)
        if not isinstance(questions, list):
            questions = [{"id": "q1", "question": "请描述这份 PPT 的目标受众和核心目的", "hint": "", "type": "text"}]

        yield f"event: interview_questions\ndata: {json.dumps({'questions': questions, 'context': context}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        logger.error(f"❌ 访谈问题生成异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"


async def enrich_single_slide(
    slide: SlideCard,
    strategy_brief: str = "",
) -> dict:
    """单页深度充实（非流式，直接返回充实后的 slide）。"""
    client = create_llm_client(temperature=0.5)

    logger.info(f"📝 单页充实 | {slide.title[:40]} | {len(slide.content)} 个要点")

    if slide.type in ("cover", "agenda", "ending"):
        logger.info("   ⏭️ 跳过（非内容页）")
        return slide.model_dump()

    # 搜索
    search_query = f"{slide.title} {' '.join(slide.content[:2])}"
    search_results = await web_search(search_query, max_results=3)

    system_prompt = f"""你是一位顶级 PPT 内容策划师。将空洞的要点充实为有数据、有案例、有对比的专业内容。
- 每个要点 30-60 字，信息密度高
- 要点数量可扩展到 4-5 个
- 保持 PPT 适配
{f"策略简报：{strategy_brief[:300]}" if strategy_brief else ""}
直接输出 JSON 数组：["要点1", "要点2", ...]"""

    user_prompt = f"标题: {slide.title}\n要点:\n{json.dumps(slide.content, ensure_ascii=False)}\n\n搜索结果:\n{search_results}"

    raw = await client.complete(system_prompt, user_prompt)

    from app.utils.json_repair import safe_parse_json
    parsed = safe_parse_json(raw)
    enriched_content = [str(item) for item in parsed] if isinstance(parsed, list) else slide.content

    result = slide.model_dump()
    result["content"] = enriched_content

    logger.info(f"   ✅ 单页充实完成: {len(slide.content)} → {len(enriched_content)} 个要点")
    return result


async def optimize_outline(
    slides: list[SlideCard],
    instruction: str = "",
    strategy_brief: str = "",
) -> AsyncGenerator[str, None]:
    """AI 优化大纲结构：调骨架，不推翻。可能改顺序、合并/拆分页、重写标题。"""
    client = create_llm_client(temperature=0.6)

    logger.info(
        f"\n{'='*50}\n"
        f"🔧 大纲结构优化\n"
        f"   页数: {len(slides)}\n"
        f"   用户指令: {instruction or '(无，自动优化)'}\n"
        f"{'='*50}"
    )

    slides_json = json.dumps([s.model_dump() for s in slides], ensure_ascii=False, indent=2)

    system_prompt = f"""你是一位顶级 PPT 结构优化专家。用户已经有了一套大纲，但结构可能不够理想。

## 你的任务
在**保留核心内容**的前提下，优化大纲的逻辑结构。你可以：
- 调整章节顺序（更合逻辑的递进关系）
- 合并内容相近的页面
- 拆分信息过载的页面
- 重写页面标题（改为结论前置的论点式标题）
- 调整要点的归属（把放错位置的内容移到更合适的页面）

## 不可以做的
- 不要凭空编造新内容
- 不要删除用户的核心信息
- 不要改变封面(cover)和结尾(ending)的类型

{f"## 用户指令{chr(10)}{instruction}" if instruction else ""}
{f"## 策略简报参考{chr(10)}{strategy_brief[:500]}" if strategy_brief else ""}

## 输出格式
输出优化后的完整 slides JSON 数组。每个 slide 的格式：
{{"id": "slide-N", "title": "...", "type": "cover|agenda|content|ending", "content": [...], "visual": "...", "color": "..."}}

直接输出 JSON 数组，不要其他文字。"""

    user_prompt = f"当前大纲：\n{slides_json}"

    try:
        yield await sse_event("status", {"phase": "optimizing"})

        raw = await client.complete(system_prompt, user_prompt)

        logger.info(f"🔧 优化输出 ({len(raw)} 字):\n{raw[:500]}...")

        from app.utils.json_repair import safe_parse_json
        parsed = safe_parse_json(raw)

        if isinstance(parsed, list):
            optimized = parsed
        elif isinstance(parsed, dict) and "slides" in parsed:
            optimized = parsed["slides"]
        else:
            optimized = [s.model_dump() for s in slides]
            logger.warning("⚠️ 优化输出格式异常，返回原大纲")

        yield f"event: outline\ndata: {json.dumps({'slides': optimized}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

        logger.info(f"🔧 优化完成: {len(slides)} → {len(optimized)} 页")

    except Exception as e:
        logger.error(f"❌ 大纲优化异常: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
