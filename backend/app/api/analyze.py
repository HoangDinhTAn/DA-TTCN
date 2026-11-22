from fastapi import APIRouter, HTTPException, Request
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse

router = APIRouter(
    prefix="/api/v1",
    tags=["Fraud Analysis"],
)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_transaction(payload: AnalyzeRequest, request: Request):
    nlp_service = getattr(request.app.state, "nlp_service", None)
    gnn_service = getattr(request.app.state, "gnn_service", None)

    if not nlp_service or not nlp_service.is_loaded or not gnn_service or not gnn_service.is_loaded:
        raise HTTPException(status_code=503, detail="Các mô hình AI chưa sẵn sàng.")

    nlp_res = nlp_service.analyze(payload.message)
    extracted_accounts = nlp_res["entities"]["extracted_accounts"]
    target_account = payload.account_number or (extracted_accounts[0] if extracted_accounts else None)

    gnn_res = gnn_service.score_account(
        account_number=target_account,
        amount=payload.amount,
    )

    nlp_score = nlp_res["nlp_risk_score"]
    gnn_score = gnn_res["gnn_risk_score"]
    final_score = round(0.4 * nlp_score + 0.6 * gnn_score, 2)

    if final_score >= 70.0 or (nlp_score >= 60.0 and gnn_score >= 60.0):
        decision = "BLOCK"
        summary = "CẢNH BÁO ĐỎ: Rủi ro lừa đảo cao. Khuyến nghị CHẶN giao dịch."
    elif final_score >= 40.0:
        decision = "REVIEW"
        summary = "CẢNH BÁO VÀNG: Có yếu tố đáng ngờ. Cần xác thực thêm trước khi chuyển."
    else:
        decision = "APPROVE"
        summary = "AN TOÀN: Giao dịch nằm trong ngưỡng an toàn."

    return AnalyzeResponse(
        decision=decision,
        final_risk_score=final_score,
        summary_message=summary,
        resolved_account=target_account,
        nlp_result=nlp_res,
        gnn_result=gnn_res,
    )