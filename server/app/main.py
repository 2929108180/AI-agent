import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.router import api_router
from app.config import settings

# ─── 日志配置 ───
logger.remove()
logger.add(sys.stderr, format="{time:HH:mm:ss.SSS} | {level:<7} | {message}")

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = str(LOG_DIR / "api_{time:YYYY-MM-DD}.log")
logger.add(LOG_FILE, rotation="1 day", retention="7 days", encoding="utf-8",
           format="{time:HH:mm:ss.SSS} | {level:<7} | {message}")

logger.info(f"日志文件目录: {LOG_DIR}")

app = FastAPI(
    title="AI PPT Agent",
    description="LLM 驱动的高保真演示文稿生成引擎",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
