"""
Vote Schemas

Pydantic models for vote casting and verification.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VoteCast(BaseModel):
    """
    Schema for casting a vote.
    
    The vote_data is encrypted on the frontend before submission.
    Only the encrypted data is received - never plaintext ballot choices.
    """
    election_id: int = Field(..., description="Election to vote in")
    encrypted_vote: str = Field(
        ...,
        min_length=1,
        description="Encrypted vote data (frontend encrypts before submission)"
    )
    vote_hash: Optional[str] = Field(
        None,
        description="Client-generated vote hash (commitment) for ZK verification"
    )


class VoteResponse(BaseModel):
    """Schema for vote confirmation response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    election_id: int
    vote_hash: str = Field(..., description="SHA-256 hash of the vote")
    tx_hash: str = Field(..., description="Blockchain transaction hash")
    created_at: datetime
    
    # Verification info
    verification_url: Optional[str] = Field(
        None,
        description="URL to verify vote on blockchain explorer"
    )


class VoteVerification(BaseModel):
    """Schema for vote verification response."""
    vote_hash: str
    tx_hash: str
    block_number: Optional[int] = None
    election_id: int
    election_title: str
    verified: bool = Field(..., description="Whether vote is verified on blockchain")
    timestamp: datetime
    
    # Public metadata (never contains vote content)
    jurisdiction: Optional[str] = None
    poll_station: Optional[str] = None


class VoteReceipt(BaseModel):
    """
    Schema for voter receipt.
    
    This is what the voter receives after casting their vote.
    Contains only verification data - never the actual vote content.
    """
    vote_id: str = Field(..., description="Unique vote identifier")
    vote_hash: str = Field(..., description="Cryptographic hash for verification")
    tx_hash: str = Field(..., description="Blockchain transaction reference")
    election_id: int
    election_title: str
    cast_at: datetime
    
    # Instructions for voter
    verification_instructions: str = Field(
        default="Save this receipt. You can verify your vote at any time using the vote hash.",
        description="Instructions for voter"
    )
