import json
import sys
from pathlib import Path
import torch

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from HlmhGNN import FraudGNN  # noqa: E402

DEFAULT_MOCK_ACCOUNTS = {
    "10000001": {
        "owner": "Tài khoản chính chủ",
        "is_new_account": False,
        "rapid_drain": False,
        "has_history_with_user": True,
        "base_gnn_risk": 5.0,
    },
    "10000002": {
        "owner": "Người thân / Đối tác quen thuộc",
        "is_new_account": False,
        "rapid_drain": False,
        "has_history_with_user": True,
        "base_gnn_risk": 8.0,
    },
    "99998888": {
        "owner": "Tài khoản lạ / Nghi vấn gian lận",
        "is_new_account": True,
        "rapid_drain": True,
        "has_history_with_user": False,
        "base_gnn_risk": 92.0,
    },
}


class GNNService:
    def __init__(
        self,
        weights_path: Path,
        mock_db_path: Path,
        in_channels: int = 11,
        hidden_channels: int = 32,
    ):
        self.weights_path = weights_path
        self.mock_db_path = mock_db_path
        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        self.model = None
        self.accounts_db = {}
        self.is_loaded = False

    def load_model(self):
        if not self.weights_path.exists():
            raise FileNotFoundError(f"Không tìm thấy file trọng số GNN: {self.weights_path}")

        if not self.mock_db_path.exists():
            self.mock_db_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.mock_db_path, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_MOCK_ACCOUNTS, f, ensure_ascii=False, indent=2)

        with open(self.mock_db_path, "r", encoding="utf-8") as f:
            self.accounts_db = json.load(f)

        model = FraudGNN(in_channels=self.in_channels, hidden_channels=self.hidden_channels)
        state_dict = torch.load(self.weights_path, map_location="cpu")
        model.load_state_dict(state_dict)
        model.eval()

        self.model = model
        self.is_loaded = True

    def score_account(self, account_number: str | None, amount: float = 0.0) -> dict:
        if not self.is_loaded:
            raise RuntimeError("GNN model chưa được load.")

        if not account_number:
            return {
                "account_number": None,
                "found_in_db": False,
                "gnn_risk_score": 25.0,
                "reason": "Chưa có số tài khoản đích để kiểm tra trên đồ thị.",
            }

        acc_info = self.accounts_db.get(account_number.strip())

        with torch.no_grad():
            local_x = torch.zeros((3, self.in_channels), dtype=torch.float32)
            local_edge_index = torch.tensor([[0, 1, 2, 1], [1, 0, 1, 2]], dtype=torch.long)

            if acc_info:
                local_x[1, 0] = 1.0 if acc_info.get("is_new_account") else -1.0
                local_x[1, 1] = float(amount) / 1_000_000.0
                local_x[1, 2] = -2.0 if acc_info.get("rapid_drain") else 1.0
                raw_prob = float(self.model(local_x, local_edge_index)[1].item())

                if acc_info.get("has_history_with_user") and not acc_info.get("rapid_drain"):
                    gnn_score = min(acc_info.get("base_gnn_risk", 8.0), 15.0)
                    reason = f"Tài khoản '{acc_info.get('owner')}' có lịch sử giao dịch tin cậy."
                else:
                    gnn_score = max(acc_info.get("base_gnn_risk", 85.0), round(raw_prob * 100.0, 2))
                    reason = f"Tài khoản '{acc_info.get('owner')}' có đặc trưng rủi ro cao."
                found_in_db = True
            else:
                local_x[1, 0] = 1.5
                local_x[1, 1] = float(amount) / 1_000_000.0
                local_x[1, 2] = -1.5
                raw_prob = float(self.model(local_x, local_edge_index)[1].item())
                gnn_score = round(max(65.0, min(raw_prob * 100.0 + 35.0, 95.0)), 2)
                reason = "STK chưa có trong CSDL tin cậy, tiềm ẩn rủi ro tài khoản mới/lạ."
                found_in_db = False

        return {
            "account_number": account_number,
            "found_in_db": found_in_db,
            "gnn_risk_score": round(min(max(gnn_score, 0.0), 100.0), 2),
            "reason": reason,
        }