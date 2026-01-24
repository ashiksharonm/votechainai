"""VoteChainAI API Routes Package."""

from fastapi import APIRouter

from app.api import auth, elections, votes, audit, face

# Main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(elections.router, prefix="/elections", tags=["Elections"])
api_router.include_router(votes.router, prefix="/vote", tags=["Voting"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
api_router.include_router(face.router, prefix="/face", tags=["Face Recognition"])
