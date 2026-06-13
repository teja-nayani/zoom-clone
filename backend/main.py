from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, SessionLocal
import models
from routers import meetings, participants
from websocket.signaling import router as ws_router

models.Base.metadata.create_all(bind=engine)


def _seed_default_user():
    """Ensure the demo user (id=1) exists so all endpoints work out of the box."""
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.id == 1).first():
            db.add(models.User(id=1, name="Demo User", email="demo@example.com"))
            db.commit()
    finally:
        db.close()


_seed_default_user()

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
