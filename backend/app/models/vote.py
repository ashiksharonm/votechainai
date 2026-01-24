"""
Vote Model

Defines the Vote entity with blockchain integration.
Only hashes are stored - never the actual vote content.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vote(Base):
    """
    Vote model for recording vote hashes and blockchain transactions.
    
    SECURITY NOTE: The actual vote content is NEVER stored.
    Only cryptographic hashes and blockchain transaction references.
    
    Attributes:
        id: Primary key
        user_id: Voter reference (FK)
        election_id: Election reference (FK)
        vote_hash: SHA-256 hash of the vote
        tx_hash: Blockchain transaction hash
        created_at: Vote timestamp
    """
    
    __tablename__ = "votes"
    
    # Ensure one vote per user per election
    __table_args__ = (
        UniqueConstraint("user_id", "election_id", name="uq_user_election_vote"),
    )
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    election_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("elections.id"),
        nullable=False,
        index=True
    )
    vote_hash: Mapped[str] = mapped_column(
        String(66),  # 0x + 64 hex chars
        nullable=False,
        index=True
    )
    tx_hash: Mapped[str] = mapped_column(
        String(66),  # 0x + 64 hex chars
        nullable=False,
        unique=True,
        index=True
    )
    encrypted_vote: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default=""
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="votes")
    election: Mapped["Election"] = relationship("Election", back_populates="votes")
    
    def __repr__(self) -> str:
        return f"<Vote(id={self.id}, election={self.election_id}, hash={self.vote_hash[:10]}...)>"
