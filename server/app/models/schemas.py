"""Pydantic 数据模型 — 请求与响应"""

from pydantic import BaseModel


# ─── 阶段 1：输入网关 ───

class TrackARequest(BaseModel):
    topic: str
    audience: str = "professional"
    length: str = "standard"


class TrackBTextRequest(BaseModel):
    reference_text: str
    audience: str = "professional"
    length: str = "standard"


class PolishRequest(BaseModel):
    topic: str
    audience: str = "professional"


# ─── 阶段 2：大纲 ───

class OutlineGenerateRequest(BaseModel):
    topic: str
    audience: str = "professional"
    length: str = "standard"
    context: str | None = None
    extra: str | None = None


class OutlineRefineRequest(BaseModel):
    outline_json: str
    instruction: str | None = None


# ─── 阶段 3：排版 ───

class LayoutRequest(BaseModel):
    page_content_json: str


class CardLayout(BaseModel):
    id: str
    x: float
    y: float
    w: float
    h: float
    role: str


class LayoutResponse(BaseModel):
    cards: list[CardLayout]


# ─── 阶段 4：渲染 ───

class RenderRequest(BaseModel):
    page_content: str
    layout_json: str


# ─── 导出 ───

class ExportRequest(BaseModel):
    pages_svg: list[str]
    filename: str = "presentation"
