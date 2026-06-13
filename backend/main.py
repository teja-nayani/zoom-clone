from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
import models
from routers import meetings, participants
from seed import seed_all
from websocket.signaling import router as ws_router

models.Base.metadata.create_all(bind=engine)
seed_all()

app = FastAPI(title="Zoom Clone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router, prefix="/meetings", tags=["meetings"])
app.include_router(participants.router, prefix="/meetings", tags=["participants"])
app.include_router(ws_router, tags=["websocket"])


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
