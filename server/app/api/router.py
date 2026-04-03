from fastapi import APIRouter

from app.api.v1 import export, ingestion, layout, outline, pipeline, render

api_router = APIRouter()

api_router.include_router(ingestion.router, prefix="/v1/ingestion", tags=["Ingestion Gateway"])
api_router.include_router(outline.router, prefix="/v1/outline", tags=["Outline Architect"])
api_router.include_router(layout.router, prefix="/v1/layout", tags=["Layout Planner"])
api_router.include_router(render.router, prefix="/v1/render", tags=["SVG Renderer"])
api_router.include_router(export.router, prefix="/v1/export", tags=["Export"])
api_router.include_router(pipeline.router, prefix="/v1/pipeline", tags=["Progressive Pipeline"])
