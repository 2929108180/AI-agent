"""Pydantic 数据模型 — 请求与响应"""

from pydantic import BaseModel


# ─── 阶段 1：输入网关 ───

class TrackARequest(BaseModel):
    topic: str
    audience: str = "professional"
    length: str = "standard"
    custom_audience: str = ""           # 自定义受众名称
    custom_audience_note: str = ""      # 自定义受众补充说明


class TrackBTextRequest(BaseModel):
    reference_text: str
    audience: str = "professional"
    length: str = "standard"
    custom_audience: str = ""
    custom_audience_note: str = ""


class PolishRequest(BaseModel):
    topic: str
    audience: str = "professional"
    instruction: str | None = None


# ─── 阶段 2：大纲 ───

class OutlineGenerateRequest(BaseModel):
    topic: str
    audience: str = "professional"
    length: str = "standard"
    context: str | None = None
    extra: str | None = None


class OutlineEnrichRequest(BaseModel):
    """逐页深度检索充实请求。"""
    slides: list["SlideCard"]
    strategy_brief: str = ""


class OutlineEnrichSingleRequest(BaseModel):
    """单页深度充实请求。"""
    slide: "SlideCard"
    strategy_brief: str = ""


class OutlineOptimizeRequest(BaseModel):
    """AI 优化当前大纲结构（不推翻，调骨架）。"""
    slides: list["SlideCard"]
    instruction: str = ""         # 用户可选的优化方向提示
    strategy_brief: str = ""


class InterviewStartRequest(BaseModel):
    """Track A 多轮访谈启动请求。"""
    topic: str


class InterviewAnswerRequest(BaseModel):
    """用户回答访谈问题后生成大纲。"""
    topic: str
    questions_and_answers: list[dict]   # [{"question": "...", "answer": "..."}]
    audience: str = "auto"
    length: str = "standard"
    custom_audience: str = ""
    custom_audience_note: str = ""


class OutlineRefineRequest(BaseModel):
    outline_json: str
    instruction: str | None = None


class ProgressivePipelineRequest(BaseModel):
    """渐进式全流程管道请求。"""
    slides: list["SlideCard"]
    theme: str = "apple-frost"
    strategy_brief: str = ""
    skip_enrich: bool = False             # 全局：跳过所有页充实
    skip_design: bool = False             # 全局：跳过所有页设计稿
    skip_enrich_indices: list[int] = []   # 按页跳过充实（已手动充实过的页码，0-based）


# ─── 阶段 3：幻灯片生成与排版 ───

class SlideCard(BaseModel):
    """单张幻灯片的大纲数据（来自 Step 2）。"""
    id: str = ""
    title: str = ""
    type: str = "content"     # cover | agenda | content | showcase | ending
    content: list[str] = []
    visual: str = ""
    color: str = ""

    model_config = {"extra": "allow"}  # 前端可能多传字段


class SlideGenerateRequest(BaseModel):
    """生成单张幻灯片的元素布局。"""
    slide: SlideCard
    theme: str = "apple-frost"
    strategy_brief: str = ""


class SlideElementStyle(BaseModel):
    """前端 SlideElement.style 对应的样式对象。"""
    position: str = "absolute"
    top: str | None = None
    left: str | None = None
    width: str | None = None
    height: str | None = None
    fontSize: str | None = None
    fontWeight: str | None = None
    lineHeight: str | None = None
    zIndex: str | None = None
    borderRadius: str | None = None
    padding: str | None = None

    model_config = {"extra": "allow"}  # 允许额外样式字段


class SlideElement(BaseModel):
    """单个画布元素，与前端 SlideElement 类型一致。"""
    id: str
    type: str           # text | box | image
    content: str | None = None
    style: dict = {}
    isBentoCard: bool | None = None


class SlideGenerateResponse(BaseModel):
    """生成结果：元素数组。"""
    elements: list[SlideElement]


class AiEditRequest(BaseModel):
    """AI 元素编辑请求 — 上下文感知。"""
    element_id: str                    # 选中元素 id（如 card2_desc）
    element_content: str               # 选中元素当前文本
    instruction: str                   # 用户指令或快捷指令
    slide_title: str = ""              # 当前页面主标题
    slide_type: str = ""               # cover / content / ending
    all_texts: list[str] = []          # 当前页面所有可见文本（上下文）
    strategy_brief: str = ""           # Step 1 生成的策略简报（可选）


class AiSuggestRequest(BaseModel):
    """请求动态快捷指令建议。"""
    element_id: str                    # 选中元素 id
    element_content: str               # 选中元素当前文本
    element_role: str = ""             # 元素角色：header_title / card_title / card_desc 等
    slide_title: str = ""              # 当前页面主标题
    slide_type: str = ""               # 页面类型


class AiSuggestResponse(BaseModel):
    """返回 3-5 条场景化快捷指令。"""
    suggestions: list[str]


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

class ExportSlideData(BaseModel):
    """单张幻灯片导出数据。"""
    elements: list[SlideElement]
    theme: str = "apple-frost"


class ExportRequest(BaseModel):
    """PPTX 导出请求。"""
    slides: list[ExportSlideData]
    filename: str = "presentation"
