"""FastAPI server for Sambodhan urgency classifier."""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.data_science.models.urgency_inference import UrgencyClassifier
import uvicorn
from typing import Dict, Optional

app = FastAPI(title="Sambodhan Urgency API")

classifier = UrgencyClassifier("./sambodhan_model")

class GrievanceRequest(BaseModel):
    text: str
    return_probabilities: bool = False

class GrievanceResponse(BaseModel):
    urgency: str
    confidence: float
    probabilities: Optional[Dict[str, float]] = None

@app.get("/")
def read_root():
    return {"message": "Sambodhan Urgency Classifier API", "status": "running"}

@app.post("/predict_urgency", response_model=GrievanceResponse)
def predict_urgency(request: GrievanceRequest):
    try:
        result = classifier.predict(request.text, request.return_probabilities)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)