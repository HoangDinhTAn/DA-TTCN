import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router


# =====================================
# 1. CẤU HÌNH LOGGING
# =====================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# =====================================
# 2. QUẢN LÝ VÒNG ĐỜI ỨNG DỤNG
# =====================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Starting Fraud Detection Backend...")

    logger.info("Backend initialization completed.")

    yield

    logger.info("Shutting down Backend...")


# =====================================
# 3. KHỞI TẠO FASTAPI
# =====================================

app = FastAPI(
    title="Fraud Detection API",
    description="""
    Backend API for Fraud Detection System.

    AI Modules:
    - NLP: Natural Language Processing
    - GNN: Graph Neural Network
    """,
    version="1.0.0",
    lifespan=lifespan
)


# =====================================
# 4. CẤU HÌNH CORS MIDDLEWARE
# =====================================

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================
# 5. ĐĂNG KÝ ROUTER
# =====================================

app.include_router(health_router)


# =====================================
# 6. API TRANG CHỦ
# =====================================

@app.get("/")
async def root():

    return {
        "success": True,
        "message": "Fraud Detection Backend is running",
        "version": "1.0.0"
    }


# =====================================
# 7. API KIỂM TRA VERSION
# =====================================
@app.get("/version")
async def version():

    return {
        "application": "Fraud Detection System",
        "version": "1.0.0",
        "framework": "FastAPI"
    }


# =====================================
# 8. API THÔNG TIN HỆ THỐNG
# =====================================

@app.get("/api/v1/info")
async def system_info():

    return {
        "system": "Fraud Detection System",
        "backend": "FastAPI",
        "version": "1.0.0",
        "modules": {
            "NLP": "Ready for integration",
            "GNN": "Ready for integration"
        },
        "status": "running"
    }