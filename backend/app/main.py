import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.analyze import router as analyze_router
from app.services.nlp import NLPService
from app.services.gnn import GNNService


# =====================================
# 1. CẤU HÌNH LOGGING
# =====================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[2]


# =====================================
# 2. QUẢN LÝ VÒNG ĐỜI ỨNG DỤNG
# =====================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Fraud Detection Backend...")

    nlp_service = NLPService(model_path=ROOT_DIR / "nlp_model.pkl")
    gnn_service = GNNService(
        weights_path=ROOT_DIR / "HlmhGNN.pth",
        mock_db_path=ROOT_DIR / "backend" / "app" / "data" / "mock_accounts.json",
        in_channels=11,
        hidden_channels=32,
    )

    nlp_service.load_model()
    gnn_service.load_model()

    app.state.nlp_service = nlp_service
    app.state.gnn_service = gnn_service

    logger.info("NLP and GNN models loaded. Backend initialization completed.")

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
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
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
app.include_router(analyze_router)


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
    nlp_loaded = getattr(getattr(app.state, "nlp_service", None), "is_loaded", False)
    gnn_loaded = getattr(getattr(app.state, "gnn_service", None), "is_loaded", False)

    return {
        "system": "Fraud Detection System",
        "backend": "FastAPI",
        "version": "1.0.0",
        "modules": {
            "NLP": "Loaded" if nlp_loaded else "Not initialized",
            "GNN": "Loaded" if gnn_loaded else "Not initialized"
        },
        "status": "running"
    }