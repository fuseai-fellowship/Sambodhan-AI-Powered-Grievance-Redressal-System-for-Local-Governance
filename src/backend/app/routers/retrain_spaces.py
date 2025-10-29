from fastapi import APIRouter
from huggingface_hub import HfApi
import os

router = APIRouter(prefix="/api/retrain", tags=["Retrain Spaces"])

api = HfApi()

HF_TOKEN = os.getenv("hf_token")
DEPARTMENT_RETRAIN_SPACE_ID = os.getenv("DEPARTMENT_RETRAIN_SPACE_ID")
URGENCY_RETRAIN_SPACE_ID = os.getenv("URGENCY_RETRAIN_SPACE_ID")
PREPARE_DATASET_SPACE_ID = os.getenv("PREPARE_DATASET_SPACE_ID")

DEPARTMENT_SPACE_URL = f"https://huggingface.co/spaces/{DEPARTMENT_RETRAIN_SPACE_ID}"
URGENCY_SPACE_URL = f"https://huggingface.co/spaces/{URGENCY_RETRAIN_SPACE_ID}"
DATASET_SPACE_URL = f"https://huggingface.co/spaces/{PREPARE_DATASET_SPACE_ID}"


@router.post("/department")
def restart_department_classifier_space():
    try:
        api.restart_space(DEPARTMENT_RETRAIN_SPACE_ID, token=HF_TOKEN)
        return {"status": "success", "message": f"Restarted department classifier: {DEPARTMENT_RETRAIN_SPACE_ID}", "url": DEPARTMENT_SPACE_URL}
    except Exception as e:
        return {"status": "error", "message": str(e), "url": DEPARTMENT_SPACE_URL}


@router.post("/urgency")
def restart_urgency_classifier_space():
    try:
        api.restart_space(URGENCY_RETRAIN_SPACE_ID, token=HF_TOKEN)
        return {"status": "success", "message": f"Restarted urgency classifier: {URGENCY_RETRAIN_SPACE_ID}", "url": URGENCY_SPACE_URL}
    except Exception as e:
        return {"status": "error", "message": str(e), "url": URGENCY_SPACE_URL}


@router.post("/dataset")
def restart_prepare_dataset_space():
    try:
        api.restart_space(PREPARE_DATASET_SPACE_ID, token=HF_TOKEN)
        return {"status": "success", "message": f"Restarted dataset preparation space: {PREPARE_DATASET_SPACE_ID}", "url": DATASET_SPACE_URL}
    except Exception as e:
        return {"status": "error", "message": str(e), "url": DATASET_SPACE_URL}
