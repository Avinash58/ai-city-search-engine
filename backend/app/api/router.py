from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.search.router import router as search_router
from app.api.v1.ai.router import router as ai_router
from app.api.v1.user.router import router as user_router
from app.api.v1.admin.router import router as admin_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(search_router, prefix="/v1/search", tags=["search"])
api_router.include_router(ai_router, prefix="/v1/ai", tags=["ai"])
api_router.include_router(user_router, prefix="/v1/user", tags=["user"])
api_router.include_router(admin_router, prefix="/v1/admin", tags=["admin"])

