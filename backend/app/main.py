"""
VoteChainAI Backend - Main Application

FastAPI application entry point with middleware, CORS, and router configuration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.config import settings
from app.database import close_db, init_db


# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    
    Initializes database on startup and closes connections on shutdown.
    """
    logger.info("Starting VoteChainAI Backend...")
    
    # Initialize database (graceful failure for development)
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        logger.warning("Running in limited mode - some features may be unavailable")
        logger.warning("Start PostgreSQL with: docker run -d --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=votechainai -p 5432:5432 postgres:15")
    
    yield
    
    # Cleanup
    try:
        await close_db()
        logger.info("Database connections closed")
    except Exception:
        pass


# Create FastAPI application
app = FastAPI(
    title="VoteChainAI API",
    description="""
## VoteChainAI Backend API

Secure, blockchain-backed voting system with AI-assisted integrity monitoring.

### Features
- **Authentication**: JWT-based auth with role-based access control
- **Elections**: Create, manage, and monitor elections
- **Voting**: Secure vote casting with blockchain immutability
- **Audit**: Complete audit trail for transparency

### Security Guarantees
- Passwords hashed with bcrypt
- Vote content never stored (only hashes)
- Blockchain-backed vote immutability
- One vote per user per election

### Roles
- **ADMIN**: Create elections, view analytics, manage users
- **VOTER**: Cast votes, verify receipts
- **AUDITOR**: View audit logs (read-only)
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS - explicit origins required when using credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with structured response."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__
        }
    )


# Include API routes
app.include_router(api_router, prefix=settings.api_prefix)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns service status for monitoring and load balancers.
    """
    return {
        "status": "healthy",
        "service": "votechainai-backend",
        "version": "1.0.0"
    }


# Root endpoint
# Serve Frontend (SPA)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Path to static files (frontend build)
static_dir = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(static_dir):
    # Mount assets folder
    if os.path.isdir(os.path.join(static_dir, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Serve files or fallback to index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Skip API routes (let them 404 if not matched above)
        if full_path.startswith("api"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})

        # Check if file exists (e.g. vite.svg, robots.txt)
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(static_dir, "index.html"))

    # Root route
    @app.get("/", tags=["Info"])
    async def root():
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    # Development fallback
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": "VoteChainAI API",
            "version": "1.0.0",
            "documentation": "/docs",
            "health": "/health",
            "message": "Frontend not found. Run in Docker or use npm run dev."
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )

# Trigger reload for DB reset
