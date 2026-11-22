from typing import Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Nội dung tin nhắn cần phân tích")
    account_number: Optional[str] = Field(default=None, description="STK đích (nếu trống sẽ tự lấy từ NLP)")
    amount: float = Field(default=0.0, ge=0.0, description="Số tiền giao dịch")


class AnalyzeResponse(BaseModel):
    decision: str
    final_risk_score: float
    summary_message: str
    resolved_account: Optional[str] = None
    nlp_result: dict
    gnn_result: dict