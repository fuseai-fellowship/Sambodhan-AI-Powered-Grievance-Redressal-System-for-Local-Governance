from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch
import os

class UrgencyPredictor:
    def __init__(self, model_repo="sambodhan/sambodhan_urgency_classifier",
                 cache_dir="/app/hf_cache"):
        """Load model and tokenizer once at startup."""
        
        self.model_repo = model_repo
        self.cache_dir = cache_dir

        # Ensure cache folder exists
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Device selection
        self.device = 0 if torch.cuda.is_available() else -1

        print("Loading tokenizer and model...")
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_repo, cache_dir=self.cache_dir, force_download=True)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_repo, cache_dir=self.cache_dir, force_download=True)

        # Create classification pipeline
        self.classifier = pipeline(
            "text-classification",
            model=self.model,
            tokenizer=self.tokenizer,
            device=self.device,
            return_all_scores=True
        )
        print("Model and tokenizer loaded successfully.")

    def predict(self, texts):
        """Predict urgency labels with scores for a single text or a batch."""
        if isinstance(texts, str):
            texts = [texts]

        results = self.classifier(texts)
        formatted_results = []

        for preds in results:
            # Sort by descending confidence
            preds = sorted(preds, key=lambda x: x["score"], reverse=True)
            top_pred = preds[0]
            label = top_pred["label"]
            confidence = round(top_pred["score"], 4)
            scores_dict = {p["label"]: round(p["score"], 4) for p in preds}

            formatted_results.append({
                "label": label,
                "confidence": confidence,
                "scores": scores_dict
            })

        # Return single dict if only one input
        return formatted_results[0] if len(formatted_results) == 1 else formatted_results

    @staticmethod
    def load_model():
        """Helper to preload the model during Docker build."""
        _ = UrgencyPredictor()
