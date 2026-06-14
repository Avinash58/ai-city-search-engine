from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.settings import settings
from app.core.logging import setup_logging
from app.serve_frontend import setup_frontend
from app.db.base import Base
from app.db.session import engine
from app.models.user import User
from app.models.activity import UserSearch, UserFavorite, UserReview, UserBooking, UserNotification

setup_logging()

# Auto-create database tables for users and dynamic dashboard activity tracking
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI City Search Engine API",
    version="1.0.0",
    description="Production-ready backend scaffold for AI-powered city search engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_frontend(app)
app.include_router(api_router, prefix="/api")




@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

