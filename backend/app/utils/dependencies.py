"""
FastAPI Dependencies

Authentication and authorization dependencies for route protection.
Works with sync SQLite database.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import decode_token


# Security scheme for bearer tokens
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[object, Depends(get_db)]
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Args:
        credentials: Bearer token from request header.
        db: Database session.
        
    Returns:
        The authenticated user.
        
    Raises:
        HTTPException: If token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Handle static admin user
    if user_id == "admin":
        from datetime import datetime
        # Create a mock admin user object with all required fields
        admin_user = User(
            id=0,
            email="ashik123@gmail.com",
            hashed_password="",
            role=UserRole.ADMIN,
            is_active=True
        )
        # Set datetime fields manually since they're not set in constructor
        admin_user.created_at = datetime.utcnow()
        admin_user.updated_at = datetime.utcnow()
        return admin_user
    
    # Get user from database (sync for SQLite)
    result = db.execute(
        select(User).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Get the current active user.
    
    Args:
        current_user: The authenticated user.
        
    Returns:
        The active user.
        
    Raises:
        HTTPException: If user is inactive.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def require_role(required_roles: list[UserRole]):
    """
    Factory for role-based access control dependencies.
    
    Args:
        required_roles: List of roles allowed to access the route.
        
    Returns:
        Dependency function that checks user role.
    """
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ) -> User:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in required_roles]}"
            )
        return current_user
    return role_checker


# Convenience dependencies for specific roles
require_admin = require_role([UserRole.ADMIN])
require_voter = require_role([UserRole.VOTER, UserRole.ADMIN])
require_auditor = require_role([UserRole.AUDITOR, UserRole.ADMIN])


# Type aliases for route parameters
CurrentUser = Annotated[User, Depends(get_current_active_user)]
AdminUser = Annotated[User, Depends(require_admin)]
VoterUser = Annotated[User, Depends(require_voter)]
AuditorUser = Annotated[User, Depends(require_auditor)]
