"""
Authentication Service

Business logic for user authentication and management.
Works with both sync (SQLite) and async (PostgreSQL) sessions.
"""

from typing import Optional

from sqlalchemy import select

from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate
from app.utils.security import create_access_token, get_password_hash, verify_password


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, db):
        """Initialize with database session."""
        self.db = db
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: User email to look up.
            
        Returns:
            User if found, None otherwise.
        """
        result = self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()
    
    def get_user_by_wallet(self, wallet_address: str) -> Optional[User]:
        """
        Get user by wallet address.
        
        Args:
            wallet_address: Ethereum wallet address.
            
        Returns:
            User if found, None otherwise.
        """
        result = self.db.execute(
            select(User).where(User.wallet_address == wallet_address.lower())
        )
        return result.scalar_one_or_none()
    
    def create_user(
        self,
        user_data: UserCreate,
        ip_address: Optional[str] = None
    ) -> User:
        """
        Create a new user.
        
        Args:
            user_data: User creation data.
            ip_address: Client IP for audit logging.
            
        Returns:
            Created user.
        """
        # Create user with hashed password
        user = User(
            email=user_data.email.lower(),
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role,
            wallet_address=user_data.wallet_address.lower() if user_data.wallet_address else None
        )
        
        self.db.add(user)
        self.db.flush()  # Get the user ID
        
        # Log the registration
        audit_log = AuditLog(
            user_id=user.id,
            action="user.register",
            details={"email": user.email, "role": user.role.value},
            ip_address=ip_address
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None
    ) -> Optional[User]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email.
            password: User password.
            ip_address: Client IP for audit logging.
            
        Returns:
            User if authenticated, None otherwise.
        """
        user = self.get_user_by_email(email)
        
        if not user:
            # Log failed login attempt
            audit_log = AuditLog(
                user_id=None,
                action="user.login.failed",
                details={"email": email, "reason": "user_not_found"},
                ip_address=ip_address
            )
            self.db.add(audit_log)
            self.db.commit()
            return None
        
        if not verify_password(password, user.hashed_password):
            # Log failed login attempt
            audit_log = AuditLog(
                user_id=user.id,
                action="user.login.failed",
                details={"reason": "invalid_password"},
                ip_address=ip_address
            )
            self.db.add(audit_log)
            self.db.commit()
            return None
        
        # Log successful login
        audit_log = AuditLog(
            user_id=user.id,
            action="user.login.success",
            details={"role": user.role.value},
            ip_address=ip_address
        )
        self.db.add(audit_log)
        self.db.commit()
        
        return user
    
    def create_token(self, user: User) -> str:
        """
        Create JWT access token for user.
        
        Args:
            user: Authenticated user.
            
        Returns:
            JWT token string.
        """
        return create_access_token(
            subject=str(user.id),
            email=user.email,
            role=user.role
        )
