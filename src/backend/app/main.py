from fastapi import FastAPI
from app.routers import complaints

app = FastAPI(title="Sambodhan API")

app.include_router(complaints.router)

@app.get("/")
def root():
    return {"message": "Welcome to Sambodhan API"}
