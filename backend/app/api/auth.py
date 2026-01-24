"""
Authentication API Routes

Handles user registration, login, and profile management.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService
from app.utils.dependencies import get_current_active_user

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email, password, and optional role."
)
async def register(
    user_data: UserCreate,
    request: Request,
    db: Annotated[object, Depends(get_db)]
) -> UserResponse:
    """
    Register a new user.
    
    - **email**: Valid email address (unique)
    - **password**: Minimum 8 characters
    - **role**: User role (default: voter)
    - **wallet_address**: Optional Ethereum wallet address
    """
    auth_service = AuthService(db)
    
    # Check if email already exists
    existing_user = auth_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if wallet address already exists
    if user_data.wallet_address:
        existing_wallet = auth_service.get_user_by_wallet(user_data.wallet_address)
        if existing_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Wallet address already registered"
            )
    
    # Create user
    user = auth_service.create_user(
        user_data,
        ip_address=request.client.host if request.client else None
    )
    
    return user


@router.post(
    "/login",
    response_model=Token,
    summary="Login and get access token",
    description="Authenticate with email and password to receive a JWT token."
)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Annotated[object, Depends(get_db)]
) -> Token:
    """
    Authenticate user and return JWT token.
    
    - **email**: Registered email address (or 'ashik123' for admin)
    - **password**: User password
    
    Returns JWT access token valid for 24 hours.
    """
    from app.utils.security import create_access_token
    from app.models.user import UserRole
    
    # Static admin login check
    STATIC_ADMIN_USERNAME = "ashik123@gmail.com"
    STATIC_ADMIN_PASSWORD = "12345678"
    
    if login_data.email == STATIC_ADMIN_USERNAME and login_data.password == STATIC_ADMIN_PASSWORD:
        # Create admin token without database user
        token = create_access_token(
            subject="admin",
            email=STATIC_ADMIN_USERNAME,
            role=UserRole.ADMIN
        )
        return Token(access_token=token, token_type="bearer")
    
    # Regular user authentication
    auth_service = AuthService(db)
    
    user = auth_service.authenticate_user(
        email=login_data.email,
        password=login_data.password,
        ip_address=request.client.host if request.client else None
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Generate token
    token = auth_service.create_token(user)
    
    return Token(access_token=token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Get the authenticated user's profile information."
)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> UserResponse:
    """
    Get current authenticated user's profile.
    
    Requires valid JWT token in Authorization header.
    """
    return current_user
