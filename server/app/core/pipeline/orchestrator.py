"""4 阶段流水线编排器"""

from app.core.pipeline.ingestion import run_track_a, run_track_b
from app.core.pipeline.architect import generate_outline, refine_outline
from app.core.pipeline.planner import compute_layout
from app.core.pipeline.renderer import render_svg

__all__ = [
    "run_track_a",
    "run_track_b",
    "generate_outline",
    "refine_outline",
    "compute_layout",
    "render_svg",
]
