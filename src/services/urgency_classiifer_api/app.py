from fastapi import FastAPI, HTTPException
from typing import Union, List
from contextlib import asynccontextmanager
import os
import uvicorn

from predict_urgency_model import UrgencyPredictor
from response_schema import TextInput, UrgencyClassificationOutput
from huggingface_hub import HfApi


# Model repository setup

model_repo = os.getenv("MODEL_REPO", "sambodhan/sambodhan_urgency_classifier")

# Hugging Face API for version info
hf_api = HfApi()


# Startup and shutdown

@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    predictor = UrgencyPredictor(model_repo=model_repo)
    yield


# FastAPI app

app = FastAPI(
    title="Sambodhan Urgency Classifier API",
    description="AI model that classifies citizen grievances by urgency with confidence scores.",
    version="1.0.0",
    lifespan=lifespan
)


# Routes

@app.post("/predict_urgency", response_model=Union[UrgencyClassificationOutput, List[UrgencyClassificationOutput]])
def predict_urgency(input_data: TextInput):
    try:
        prediction = predictor.predict(input_data.text)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/")
def root():
    latest_tag = None
    try:
        latest_tag = hf_api.list_repo_refs(repo_id=model_repo, repo_type="model").tags[0].name
    except Exception:
        latest_tag = "unknown"

    return {
        "message": "Sambodhan Urgency Classifier API is running.",
        "status": "Active" if predictor else "Inactive",
        "model_version": latest_tag
    }


# For local testing (optional)

# if __name__ == "__main__":
#     port = int(os.getenv("PORT", 7860))
#     uvicorn.run("app:app", host="0.0.0.0", port=port)
