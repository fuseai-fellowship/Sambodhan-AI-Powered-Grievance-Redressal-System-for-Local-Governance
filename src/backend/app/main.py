from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import complaints, user, location, admin
from app import chatbot_api
from app.routers.analytics import router as analytics_router
from app.routers.misclassification import router as misclassification_router
from app.routers import retrain_spaces, trigger_orchestrator

app = FastAPI(title="Sambodhan API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(complaints.router)
app.include_router(user.router)
app.include_router(location.router)
app.include_router(admin.router)
app.include_router(chatbot_api.router)
app.include_router(analytics_router)
app.include_router(misclassification_router)
app.include_router(retrain_spaces.router)
app.include_router(trigger_orchestrator.router)

@app.get("/")
def root():
    return {"message": "Welcome to Sambodhan API", "status": "running"}
