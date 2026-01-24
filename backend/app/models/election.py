"""
Election Model

Defines the Election entity with status management.
"""

import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ElectionStatus(str, enum.Enum):
    """Election lifecycle states."""
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


class Election(Base):
    """
    Election model for managing voting events.
    
    Attributes:
        id: Primary key
        title: Election title
        description: Detailed description
        start_time: When voting opens
        end_time: When voting closes
        status: Current election state
        eligible_roles: List of roles that can vote
        created_by: Admin who created the election
        created_at: Creation timestamp
    """
    
    __tablename__ = "elections"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    status: Mapped[ElectionStatus] = mapped_column(
        Enum(ElectionStatus),
        default=ElectionStatus.DRAFT,
        nullable=False
    )
    # Use JSON instead of PostgreSQL ARRAY for SQLite compatibility
    eligible_roles: Mapped[List[str]] = mapped_column(
        JSON,
        default=["voter"],
        nullable=False
    )
    # Candidates as JSON array: [{"id": 1, "name": "John", "position": "VP"}]
    candidates: Mapped[Optional[List[dict]]] = mapped_column(
        JSON,
        default=[],
        nullable=True
    )
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True  # Nullable for static admin user
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="created_elections")
    votes: Mapped[list["Vote"]] = relationship(
        "Vote",
        back_populates="election",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<Election(id={self.id}, title={self.title}, status={self.status})>"
    
    @property
    def is_active(self) -> bool:
        """Check if election is currently accepting votes."""
        now = datetime.now(self.start_time.tzinfo)
        return (
            self.status == ElectionStatus.ACTIVE
            and self.start_time <= now <= self.end_time
        )
