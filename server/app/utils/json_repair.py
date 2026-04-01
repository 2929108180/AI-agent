"""LLM 输出 JSON 修复工具"""

import json

from json_repair import repair_json


def safe_parse_json(raw: str) -> dict:
    """尝试解析 JSON，失败时自动修复。"""
    # 尝试提取被标签包裹的 JSON
    for tag in ["[PPT_OUTLINE]", "```json", "```"]:
        end_tag = tag.replace("[", "[/") if "[" in tag else "```"
        if tag in raw:
            start = raw.index(tag) + len(tag)
            end = raw.index(end_tag, start) if end_tag in raw[start:] else len(raw)
            raw = raw[start:end].strip()
            break

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        repaired = repair_json(raw, return_objects=True)
        if isinstance(repaired, dict):
            return repaired
        return {"raw": raw, "error": "JSON 解析失败"}
