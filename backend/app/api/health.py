from fastapi import APIRouter

from app.schemas.response import APIResponse, HealthResponse


router = APIRouter(
    prefix="/api/v1",
    tags=["System"]
)


# API trang chủ
@router.get("/", response_model=APIResponse)
async def home():

    return APIResponse(
        success=True,
        message="Fraud Detection Backend is running",
        data={
            "system": "Fraud Detection System",
            "backend": "FastAPI"
        }
    )


# API kiểm tra trạng thái hệ thống
@router.get("/health", response_model=HealthResponse)
async def health_check():

    return HealthResponse(
        status="healthy",
        service="Fraud Detection API",
        version="1.0.0"
    )


# API kiểm tra các thành phần
@router.get("/status", response_model=APIResponse)
async def system_status():

    return APIResponse(
        success=True,
        message="System is operating normally",
        data={
            "backend": "Online",
            "api": "Available",
            "nlp": "Not initialized",
            "gnn": "Not initialized"
        }
    )