"""
Election Schemas

Pydantic models for election request/response validation.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.election import ElectionStatus


class CandidateSchema(BaseModel):
    """Schema for election candidates."""
    id: int = Field(..., description="Candidate ID (unique within election)")
    name: str = Field(..., min_length=1, max_length=255, description="Candidate name")
    position: str = Field(..., min_length=1, max_length=255, description="Current position/title")


class ElectionBase(BaseModel):
    """Base election schema."""
    title: str = Field(..., min_length=1, max_length=255, description="Election title")
    description: Optional[str] = Field(None, description="Election description")


class ElectionCreate(ElectionBase):
    """Schema for creating elections."""
    start_time: datetime = Field(..., description="Voting start time")
    end_time: datetime = Field(..., description="Voting end time")
    eligible_roles: List[str] = Field(
        default=["voter"],
        description="Roles eligible to vote"
    )
    candidates: List[CandidateSchema] = Field(
        default=[],
        description="List of candidates for the election"
    )
    
    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: datetime, info) -> datetime:
        """Validate end_time is after start_time."""
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v
    
    @field_validator("candidates")
    @classmethod
    def validate_candidates(cls, v: List[CandidateSchema]) -> List[CandidateSchema]:
        """Validate candidates list."""
        if len(v) < 2:
            raise ValueError("Election must have at least 2 candidates")
        return v


class ElectionUpdate(BaseModel):
    """Schema for updating elections."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[ElectionStatus] = None
    eligible_roles: Optional[List[str]] = None
    candidates: Optional[List[CandidateSchema]] = None


class ElectionResponse(ElectionBase):
    """Schema for election responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    start_time: datetime
    end_time: datetime
    status: ElectionStatus
    eligible_roles: List[str]
    candidates: Optional[List[dict]] = Field(default=[], description="Candidates list")
    created_by: Optional[int] = None
    created_at: datetime
    vote_count: Optional[int] = Field(None, description="Number of votes cast")


class ElectionList(BaseModel):
    """Schema for paginated election list."""
    elections: List[ElectionResponse]
    total: int
    page: int
    per_page: int
