from fastapi import FastAPI
from app.routers import complaints, user, location

app = FastAPI(title="Sambodhan API")

app.include_router(complaints.router)
app.include_router(user.router)
app.include_router(location.router)

@app.get("/")
def root():
    return {"message": "Welcome to Sambodhan API"}
