"""
User Schemas

Pydantic models for user-related request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(..., description="User email address")


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="User password (min 8 characters)"
    )
    role: UserRole = Field(
        default=UserRole.VOTER,
        description="User role"
    )
    wallet_address: Optional[str] = Field(
        None,
        pattern=r"^0x[a-fA-F0-9]{40}$",
        description="Ethereum wallet address"
    )


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    email: Optional[EmailStr] = None
    wallet_address: Optional[str] = Field(
        None,
        pattern=r"^0x[a-fA-F0-9]{40}$"
    )
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str  # Allow non-email usernames like admin
    role: UserRole
    wallet_address: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserInDB(UserResponse):
    """Full user schema including hashed password (internal use only)."""
    hashed_password: str
