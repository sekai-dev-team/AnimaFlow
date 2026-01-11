from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from contextlib import asynccontextmanager

from src.database import init_db
from src.routers.upload import router as upload_router
from src.routers.view import router as view_router

# Initialize DB on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="AnimaFlow Server", lifespan=lifespan)

# CORS Middleware
# Allows requests from any origin (e.g., ZeroTier IPs, LAN IPs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware for SharedArrayBuffer support
# Only apply to /viewer to avoid breaking other parts of the app (like CDN scripts on dashboard)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/viewer"):
            response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
            response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/media", StaticFiles(directory="data"), name="media")
app.mount("/viewer", StaticFiles(directory="static/viewer", html=True), name="viewer")

templates = Jinja2Templates(directory="src/templates")

# Include Routers
app.include_router(upload_router, prefix="/api/upload", tags=["Upload"])
app.include_router(view_router, prefix="/api/view", tags=["View"])

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})