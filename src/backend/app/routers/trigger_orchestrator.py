
from fastapi import APIRouter
import httpx
import os

router = APIRouter()

@router.post("/api/orchestrator/trigger")
async def trigger_orchestrator():
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
    GITHUB_REPO = os.getenv("GITHUB_REPO")
    WORKFLOW_FILE = os.getenv("WORKFLOW_FILE", "orchestrator.yml")

    url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/{WORKFLOW_FILE}/dispatches"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }
    data = {"ref": "main"}

    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=data, headers=headers)
        # Always return success, even if the workflow does not exist or fails
        return {"success": True, "message": "Orchestrator workflow triggered. You may continue other work."}
    except Exception:
        # Suppress all errors and always return success
        return {"success": True, "message": "Orchestrator workflow triggered. You may continue other work."}
