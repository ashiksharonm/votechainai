"""
Audit Log Model

Records all sensitive actions for transparency and compliance.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuditLog(Base):
    """
    Audit log for tracking all sensitive operations.
    
    Every significant action is logged:
    - User authentication
    - Election management
    - Vote casting
    - Administrative actions
    
    Attributes:
        id: Primary key
        user_id: Acting user (FK)
        action: Action type (e.g., "user.login", "vote.cast")
        details: JSON object with action-specific data
        ip_address: Client IP address
        tx_hash: Blockchain tx hash if applicable
        created_at: Action timestamp
    """
    
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,  # Some actions may not have a user (e.g., failed login)
        index=True
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),  # IPv6 max length
        nullable=True
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    tx_hash: Mapped[Optional[str]] = mapped_column(
        String(66),
        nullable=True,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
    
    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action={self.action}, user={self.user_id})>"
