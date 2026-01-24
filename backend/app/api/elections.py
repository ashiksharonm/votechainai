"""
Elections API Routes

Handles election creation, listing, and management.
Works with sync SQLite database.
"""

from datetime import datetime, timezone
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.database import get_db
from app.models.election import Election, ElectionStatus
from app.models.user import User
from app.models.vote import Vote
from app.models.audit_log import AuditLog
from app.schemas.election import ElectionCreate, ElectionResponse, ElectionUpdate
from app.utils.dependencies import AdminUser, CurrentUser

router = APIRouter()


@router.post(
    "/create",
    response_model=ElectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new election",
    description="Create a new election. Requires ADMIN role."
)
async def create_election(
    election_data: ElectionCreate,
    current_user: AdminUser,
    db: Annotated[object, Depends(get_db)]
) -> ElectionResponse:
    """
    Create a new election.
    
    - **title**: Election title
    - **description**: Detailed description
    - **start_time**: When voting opens
    - **end_time**: When voting closes
    - **eligible_roles**: List of roles that can vote
    
    Requires ADMIN role.
    """
    # Create election - use None for static admin's created_by
    created_by_id = current_user.id if current_user.id != 0 else None
    
    # Convert candidates to list of dicts for JSON storage
    candidates_data = [c.model_dump() for c in election_data.candidates]
    
    election = Election(
        title=election_data.title,
        description=election_data.description,
        start_time=election_data.start_time,
        end_time=election_data.end_time,
        eligible_roles=election_data.eligible_roles or ["voter", "admin"],
        candidates=candidates_data,
        status=ElectionStatus.DRAFT,
        created_by=created_by_id
    )
    
    db.add(election)
    db.flush()
    
    # Audit log - skip user_id for static admin
    audit_log = AuditLog(
        user_id=created_by_id,
        action="election.create",
        details={
            "election_id": election.id,
            "title": election.title,
            "candidates_count": len(candidates_data)
        }
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(election)
    
    return ElectionResponse(
        id=election.id,
        title=election.title,
        description=election.description,
        start_time=election.start_time,
        end_time=election.end_time,
        status=election.status,
        eligible_roles=election.eligible_roles,
        candidates=election.candidates,
        created_by=election.created_by,
        created_at=election.created_at,
        vote_count=0
    )


@router.get(
    "/active",
    response_model=List[ElectionResponse],
    summary="List active elections",
    description="Get all currently active elections the user can vote in."
)
async def list_active_elections(
    db: Annotated[object, Depends(get_db)]
) -> List[ElectionResponse]:
    """
    List all active elections.
    
    Returns elections that have ACTIVE status.
    """
    now = datetime.now(timezone.utc)
    
    result = db.execute(
        select(Election)
        .where(Election.status == ElectionStatus.ACTIVE)
    )
    elections = result.scalars().all()
    
    # Get vote counts for each election
    responses = []
    for election in elections:
        vote_count_result = db.execute(
            select(func.count(Vote.id)).where(Vote.election_id == election.id)
        )
        vote_count = vote_count_result.scalar() or 0
        
        responses.append(ElectionResponse(
            id=election.id,
            title=election.title,
            description=election.description,
            start_time=election.start_time,
            end_time=election.end_time,
            status=election.status,
            eligible_roles=election.eligible_roles,
            candidates=election.candidates,
            created_by=election.created_by,
            created_at=election.created_at,
            vote_count=vote_count
        ))
    
    return responses


@router.get(
    "/all",
    response_model=List[ElectionResponse],
    summary="List all elections",
    description="Get all elections regardless of status. For admin panel."
)
async def list_all_elections(
    db: Annotated[object, Depends(get_db)]
) -> List[ElectionResponse]:
    """
    List all elections for admin panel.
    
    Returns all elections including draft, active, and closed.
    """
    result = db.execute(
        select(Election).order_by(Election.created_at.desc())
    )
    elections = result.scalars().all()
    
    # Get vote counts for each election
    responses = []
    for election in elections:
        vote_count_result = db.execute(
            select(func.count(Vote.id)).where(Vote.election_id == election.id)
        )
        vote_count = vote_count_result.scalar() or 0
        
        responses.append(ElectionResponse(
            id=election.id,
            title=election.title,
            description=election.description,
            start_time=election.start_time,
            end_time=election.end_time,
            status=election.status,
            eligible_roles=election.eligible_roles,
            candidates=election.candidates,
            created_by=election.created_by,
            created_at=election.created_at,
            vote_count=vote_count
        ))
    
    return responses


@router.get(
    "/{election_id}",
    response_model=ElectionResponse,
    summary="Get election details",
    description="Get details of a specific election."
)
async def get_election(
    election_id: int,
    db: Annotated[object, Depends(get_db)]
) -> ElectionResponse:
    """Get election by ID."""
    result = db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    
    # Get vote count
    vote_count_result = db.execute(
        select(func.count(Vote.id)).where(Vote.election_id == election.id)
    )
    vote_count = vote_count_result.scalar() or 0
    
    return ElectionResponse(
        id=election.id,
        title=election.title,
        description=election.description,
        start_time=election.start_time,
        end_time=election.end_time,
        status=election.status,
        eligible_roles=election.eligible_roles,
        created_by=election.created_by,
        created_at=election.created_at,
        vote_count=vote_count
    )


@router.post(
    "/{election_id}/activate",
    response_model=ElectionResponse,
    summary="Activate an election",
    description="Activate a draft election to start accepting votes. Requires ADMIN."
)
async def activate_election(
    election_id: int,
    current_user: AdminUser,
    db: Annotated[object, Depends(get_db)]
) -> ElectionResponse:
    """Activate a draft election."""
    result = db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    
    if election.status != ElectionStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft elections can be activated"
        )
    
    election.status = ElectionStatus.ACTIVE
    
    # Audit log
    created_by_id = current_user.id if current_user.id != 0 else None
    audit_log = AuditLog(
        user_id=created_by_id,
        action="election.activate",
        details={"election_id": election.id}
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(election)
    
    return ElectionResponse(
        id=election.id,
        title=election.title,
        description=election.description,
        start_time=election.start_time,
        end_time=election.end_time,
        status=election.status,
        eligible_roles=election.eligible_roles,
        created_by=election.created_by,
        created_at=election.created_at,
        vote_count=0
    )


@router.post(
    "/{election_id}/close",
    response_model=ElectionResponse,
    summary="Close an election",
    description="Close an active election. Requires ADMIN."
)
async def close_election(
    election_id: int,
    current_user: AdminUser,
    db: Annotated[object, Depends(get_db)]
) -> ElectionResponse:
    """Close an active election."""
    result = db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    
    if election.status == ElectionStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Election is already closed"
        )
    
    election.status = ElectionStatus.CLOSED
    
    # Get final vote count
    vote_count_result = db.execute(
        select(func.count(Vote.id)).where(Vote.election_id == election.id)
    )
    vote_count = vote_count_result.scalar() or 0
    
    # Audit log
    created_by_id = current_user.id if current_user.id != 0 else None
    audit_log = AuditLog(
        user_id=created_by_id,
        action="election.close",
        details={
            "election_id": election.id,
            "final_vote_count": vote_count
        }
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(election)
    
    return ElectionResponse(
        id=election.id,
        title=election.title,
        description=election.description,
        start_time=election.start_time,
        end_time=election.end_time,
        status=election.status,
        eligible_roles=election.eligible_roles,
        candidates=election.candidates,
        created_by=election.created_by,
        created_at=election.created_at,
        vote_count=vote_count
    )


@router.get(
    "/{election_id}/results",
    summary="Get election results",
    description="Get vote counts per candidate for a closed election."
)
async def get_election_results(
    election_id: int,
    db: Annotated[object, Depends(get_db)]
):
    """
    Get election results with vote counts per candidate.
    
    Only available for closed elections or elections past end_time.
    Returns candidates with their vote counts.
    """
    result = db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()
    
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )
    
    # Check if election is closed or past end time
    now = datetime.now(timezone.utc)
    is_ended = election.status == ElectionStatus.CLOSED or now > election.end_time.replace(tzinfo=timezone.utc)
    
    if not is_ended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Results are only available for closed elections"
        )
    
    # Auto-close if past end time but still active
    if election.status == ElectionStatus.ACTIVE and now > election.end_time.replace(tzinfo=timezone.utc):
        election.status = ElectionStatus.CLOSED
        db.commit()
    
    # Get total vote count
    vote_count_result = db.execute(
        select(func.count(Vote.id)).where(Vote.election_id == election.id)
    )
    total_votes = vote_count_result.scalar() or 0
    
    # Get all votes for this election to count by candidate
    votes_result = db.execute(
        select(Vote).where(Vote.election_id == election.id)
    )
    votes = votes_result.scalars().all()
    
    candidate_votes = {}
    total_valid_votes = 0
    candidates = election.candidates or []
    results = []
    
    # Initialize counts
    if candidates:
        for candidate in candidates:
            c_id = str(candidate.get("id"))
            candidate_votes[c_id] = 0

    # Count actual votes
    for vote in votes:
        # decrypted_vote = decrypt(vote.encrypted_vote) # In production
        # For this demo, we assume encrypted_vote contains the candidate ID key
        vote_val = vote.encrypted_vote
        if vote_val in candidate_votes:
            candidate_votes[vote_val] += 1
            total_valid_votes += 1
            
    # Format results
    if candidates:
        for candidate in candidates:
            c_id = str(candidate.get("id"))
            count = candidate_votes.get(c_id, 0)
            
            results.append({
                "id": candidate.get("id"),
                "name": candidate.get("name"),
                "position": candidate.get("position"),
                "votes": count,
                "percentage": round((count / total_valid_votes * 100), 1) if total_valid_votes > 0 else 0
            })
        
        # Sort by votes descending
        results.sort(key=lambda x: x["votes"], reverse=True)
    
    # Determine winner (candidate with most votes)
    winner = results[0] if results else None
    
    return {
        "election_id": election.id,
        "title": election.title,
        "status": election.status.value,
        "total_votes": total_votes,
        "candidates": results,
        "winner": winner
    }
