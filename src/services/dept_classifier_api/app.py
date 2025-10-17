from fastapi import FastAPI, HTTPException
import uvicorn
from typing import Union, List
from predict_dept_model import DepartmentPredictor
from contextlib import asynccontextmanager
from response_schema import ClassificationOutput, TextInput 



# Setting up startup and shutdown logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    predictor = DepartmentPredictor()
    yield

app = FastAPI(
    title="Sambodhan Department Classifier API",
    description="AI model that classifies citizen grievances into municipal departments with confidence scores.",
    version="1.0.0",
    lifespan=lifespan
)


@app.post("/predict", response_model=Union[ClassificationOutput, List[ClassificationOutput]])
def predict_department(input_data: TextInput):
    try:
        # Attempt to make a prediction
        prediction = predictor.predict(input_data.text)

        # Return prediction result as JSON
        return prediction

    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")



@app.get("/")
def root():
    return {"message": "Sambodhan Department Classification API is running."}

# if __name__ == "__main__":
#     # Important for Hugging Face Spaces (port detection)
#     import os
#     port = int(os.getenv("PORT", 7860))
#     uvicorn.run("main:app", host="0.0.0.0", port=port)
