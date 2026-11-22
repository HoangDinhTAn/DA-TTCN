import pickle
import re
from pathlib import Path
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class NLPService:
    def __init__(self, model_path: Path):
        self.model_path = model_path
        self.vectorizer = None
        self.kb_vectors = None
        self.knowledge_base = None
        self.is_loaded = False

    def load_model(self):
        if not self.model_path.exists():
            raise FileNotFoundError(f"Không tìm thấy file NLP model: {self.model_path}")

        with open(self.model_path, "rb") as f:
            data = pickle.load(f)

        self.vectorizer = data["vectorizer"]
        self.kb_vectors = data["kb_vectors"]
        self.knowledge_base = data["knowledge_base"]
        self.is_loaded = True

    def analyze(self, message: str) -> dict:
        if not self.is_loaded:
            raise RuntimeError("NLP model chưa được load.")

        msg_vec = self.vectorizer.transform([message])
        sims = cosine_similarity(msg_vec, self.kb_vectors)[0]
        best_idx = int(np.argmax(sims))
        best_score = float(sims[best_idx])

        is_threat = best_score > 0.12
        matched_item = self.knowledge_base[best_idx] if is_threat else {}
        scenario = (
            matched_item.get("group", "Nghi vấn lừa đảo")
            if isinstance(matched_item, dict)
            else str(matched_item)
        )

        extracted_accounts = re.findall(r"\b\d{8,14}\b", message)
        extracted_urls = re.findall(r"https?://\S+", message)
        extracted_phones = re.findall(r"\b(?:\+84|0)\d{9,10}\b", message)

        entity_bonus = (20.0 if extracted_accounts else 0.0) + (25.0 if extracted_urls else 0.0)
        risk_score = round(min(best_score * 100.0 + entity_bonus, 100.0), 2)

        return {
            "nlp_risk_score": risk_score,
            "similarity_score": round(best_score, 4),
            "is_scam": risk_score >= 40.0,
            "detected_scenario": scenario if is_threat else "Không phát hiện kịch bản độc hại",
            "entities": {
                "extracted_accounts": extracted_accounts,
                "extracted_phones": extracted_phones,
                "extracted_urls": extracted_urls,
            },
        }