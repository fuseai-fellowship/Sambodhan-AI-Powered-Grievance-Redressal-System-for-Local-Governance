from fastapi import APIRouter, HTTPException
from huggingface_hub import HfApi
import os

router = APIRouter(prefix="/api/retrain", tags=["Retrain Spaces"])

api = HfApi()

# Environment variables
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("hf_token")
DEPARTMENT_RETRAIN_SPACE_ID = os.getenv("DEPARTMENT_RETRAIN_SPACE_ID")
URGENCY_RETRAIN_SPACE_ID = os.getenv("URGENCY_RETRAIN_SPACE_ID")
PREPARE_DATASET_SPACE_ID = os.getenv("PREPARE_DATASET_SPACE_ID")

# Validation helper
def validate_config(space_id, space_name):
    """Validate that required environment variables are set"""
    if not space_id:
        raise HTTPException(
            status_code=500, 
            detail=f"Environment variable for {space_name} Space ID is not configured. Please set the appropriate environment variable in your .env file."
        )
    if not HF_TOKEN:
        raise HTTPException(
            status_code=500, 
            detail="Hugging Face token (HF_TOKEN) is not configured. Please set it in your .env file."
        )


@router.post("/department")
def restart_department_classifier_space():
    """Restart the Department Classifier training space on Hugging Face"""
    validate_config(DEPARTMENT_RETRAIN_SPACE_ID, "Department Classifier")
    
    try:
        api.restart_space(DEPARTMENT_RETRAIN_SPACE_ID, token=HF_TOKEN)
        space_url = f"https://huggingface.co/spaces/{DEPARTMENT_RETRAIN_SPACE_ID}"
        return {
            "status": "success", 
            "message": f"Department Classifier retraining initiated successfully! Space: {DEPARTMENT_RETRAIN_SPACE_ID}",
            "space_url": space_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restart Department Classifier space: {str(e)}")


@router.post("/urgency")
def restart_urgency_classifier_space():
    """Restart the Urgency Classifier training space on Hugging Face"""
    validate_config(URGENCY_RETRAIN_SPACE_ID, "Urgency Classifier")
    
    try:
        api.restart_space(URGENCY_RETRAIN_SPACE_ID, token=HF_TOKEN)
        space_url = f"https://huggingface.co/spaces/{URGENCY_RETRAIN_SPACE_ID}"
        return {
            "status": "success", 
            "message": f"Urgency Classifier retraining initiated successfully! Space: {URGENCY_RETRAIN_SPACE_ID}",
            "space_url": space_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restart Urgency Classifier space: {str(e)}")


@router.post("/dataset")
def restart_prepare_dataset_space():
    """Restart the Dataset Preparation space on Hugging Face"""
    validate_config(PREPARE_DATASET_SPACE_ID, "Dataset Preparation")
    
    try:
        api.restart_space(PREPARE_DATASET_SPACE_ID, token=HF_TOKEN)
        space_url = f"https://huggingface.co/spaces/{PREPARE_DATASET_SPACE_ID}"
        return {
            "status": "success", 
            "message": f"Dataset preparation space restarted successfully! Space: {PREPARE_DATASET_SPACE_ID}",
            "space_url": space_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restart Dataset Preparation space: {str(e)}")

