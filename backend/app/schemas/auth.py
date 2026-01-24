"""
Authentication Schemas

Pydantic models for authentication requests and JWT tokens.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: str = Field(..., description="Subject (user ID)")
    email: str = Field(..., description="User email")
    role: UserRole = Field(..., description="User role")
    exp: Optional[int] = Field(None, description="Expiration timestamp")


class RefreshToken(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str = Field(..., description="Refresh token")
