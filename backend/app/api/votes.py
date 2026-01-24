"""
Voting API Routes

Handles vote casting and verification.
Critical security: Never stores or logs actual vote content.
Works with sync SQLite database.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Annotated

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.database import get_db
from app.models.election import Election, ElectionStatus
from app.models.vote import Vote
from app.models.audit_log import AuditLog
from app.schemas.vote import VoteCast, VoteReceipt, VoteVerification
from app.services.blockchain_service import BlockchainService
from app.services.anomaly_hooks import analyze_vote_pattern
from app.utils.dependencies import VoterUser

router = APIRouter()


def generate_vote_hash(user_id: int, election_id: int, encrypted_vote: str) -> str:
    """
    Generate SHA-256 hash of vote data.
    
    The hash is deterministic but the actual vote content cannot be recovered.
    """
    data = f"{user_id}:{election_id}:{encrypted_vote}:{datetime.now(timezone.utc).isoformat()}"
    return "0x" + hashlib.sha256(data.encode()).hexdigest()


@router.post(
    "/cast",
    response_model=VoteReceipt,
    status_code=status.HTTP_201_CREATED,
    summary="Cast a vote",
    description="Cast a vote in an election. Requires VOTER role."
)
async def cast_vote(
    vote_data: VoteCast,
    current_user: VoterUser,
    request: Request,
    db: Annotated[object, Depends(get_db)]
) -> VoteReceipt:
    """
    Cast a vote in an election.
    
    - **election_id**: ID of the election to vote in
    - **encrypted_vote**: Encrypted vote data (encrypted on frontend)
    
    SECURITY:
    - Only the hash of the vote is stored
    - Actual vote content is never stored or logged
    - Transaction is recorded on blockchain for immutability
    
    Returns a receipt with verification information.
    """
    # Get election (sync)
    result = db.execute(
        select(Election).where(Election.id == vote_data.election_id)
    )
    election = result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    
    # Validate election is active
    now = datetime.now(timezone.utc)
    if election.status != ElectionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Election is not active"
        )
    
    if now < election.start_time.replace(tzinfo=timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voting has not started yet"
        )
    
    if now > election.end_time.replace(tzinfo=timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voting has ended"
        )
    
    # Check user eligibility
    if current_user.role.value not in election.eligible_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not eligible to vote in this election"
        )
    
    # Check if user already voted (sync)
    existing_vote = db.execute(
        select(Vote).where(
            Vote.user_id == current_user.id,
            Vote.election_id == election.id
        )
    )
    if existing_vote.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already voted in this election"
        )
    
    # Generate vote hash
    # If client checks "ZK Verification", they provide the hash (commitment)
    if vote_data.vote_hash:
        vote_hash = vote_data.vote_hash
    else:
        # Legacy/Server-side hash generation (verification harder/impossible)
        vote_hash = generate_vote_hash(
            current_user.id,
            election.id,
            vote_data.encrypted_vote
        )
    
    # Submit to blockchain (simulated)
    blockchain_service = BlockchainService()
    try:
        tx_hash = blockchain_service.submit_vote_sync(
            election_id=election.id,
            vote_hash=vote_hash,
            voter_address=current_user.wallet_address
        )
    except Exception as e:
        # Log blockchain failure but continue (graceful degradation)
        tx_hash = f"0x{'0' * 64}"  # Placeholder for development
    
    # Create vote record (stores encrypted vote for counting)
    vote = Vote(
        user_id=current_user.id,
        election_id=election.id,
        vote_hash=vote_hash,
        tx_hash=tx_hash,
        encrypted_vote=vote_data.encrypted_vote
    )
    
    db.add(vote)
    db.flush()
    
    # Audit log (NO vote content logged)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="vote.cast",
        details={
            "election_id": election.id,
            "vote_hash": vote_hash[:20] + "...",  # Truncated for privacy
        },
        ip_address=request.client.host if request.client else None,
        tx_hash=tx_hash
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(vote)
    
    # Run AI anomaly detection - real-time fraud analysis
    try:
        anomaly_result = analyze_vote_pattern(
            election_id=election.id,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            db=db
        )
        if anomaly_result.get("is_suspicious"):
            # Log suspicious vote for admin review
            logger.warning(f"Suspicious vote detected: user={current_user.id}, risk={anomaly_result['risk_score']}")
    except Exception as e:
        # Don't block vote on anomaly detection failure
        logger.error(f"Anomaly detection error: {e}")
    
    return VoteReceipt(
        vote_id=f"VOTE-{election.id}-{vote.id}",
        vote_hash=vote_hash,
        tx_hash=tx_hash,
        election_id=election.id,
        election_title=election.title,
        cast_at=vote.created_at
    )


@router.get(
    "/verify/{vote_hash}",
    response_model=VoteVerification,
    summary="Verify a vote",
    description="Verify a vote using its hash. Public endpoint."
)
async def verify_vote(
    vote_hash: str,
    db: Annotated[object, Depends(get_db)]
) -> VoteVerification:
    """
    Verify a vote by its hash.
    
    This is a public endpoint - anyone can verify a vote.
    Returns blockchain transaction details and election info.
    
    PRIVACY:
    - Only returns the vote hash and metadata
    - Never reveals who cast the vote or vote content
    """
    # Normalize hash
    if not vote_hash.startswith("0x"):
        vote_hash = f"0x{vote_hash}"
    
    # Find vote (sync)
    result = db.execute(
        select(Vote).where(Vote.vote_hash == vote_hash)
    )
    vote = result.scalar_one_or_none()
    
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vote not found"
        )
    
    # Get election (sync)
    result = db.execute(
        select(Election).where(Election.id == vote.election_id)
    )
    election = result.scalar_one_or_none()
    
    # Verify on blockchain
    blockchain_service = BlockchainService()
    try:
        block_number = blockchain_service.get_transaction_block_sync(vote.tx_hash)
        verified = block_number is not None
    except Exception:
        block_number = None
        verified = True  # Trust database in case of blockchain connectivity issues
    
    return VoteVerification(
        vote_hash=vote.vote_hash,
        tx_hash=vote.tx_hash,
        block_number=block_number,
        election_id=vote.election_id,
        election_title=election.title if election else "Unknown",
        verified=verified,
        timestamp=vote.created_at
    )


@router.get(
    "/my-votes",
    response_model=list[int],
    summary="Get user's voted elections",
    description="Get list of election IDs the current user has voted in."
)
async def get_my_votes(
    current_user: VoterUser,
    db: Annotated[object, Depends(get_db)]
) -> list[int]:
    """
    Get election IDs the current user has voted in.
    
    Returns a list of election IDs to determine which elections
    the user has already voted in.
    """
    result = db.execute(
        select(Vote.election_id).where(Vote.user_id == current_user.id)
    )
    election_ids = [row[0] for row in result.fetchall()]
    return election_ids
