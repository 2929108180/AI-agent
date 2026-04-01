"""提示词模板管理 — 从 prompts/ 目录加载并注入变量"""

from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "prompts"


def load_prompt(name: str) -> str:
    """加载指定名称的 prompt 模板文件。"""
    path = PROMPTS_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8")


def render_prompt(name: str, **kwargs: str) -> str:
    """加载 prompt 并替换 {{variable}} 占位符。"""
    template = load_prompt(name)
    for key, value in kwargs.items():
        template = template.replace(f"{{{{{key}}}}}", value)
    return template
