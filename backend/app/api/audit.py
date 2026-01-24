"""
Audit API Routes

Provides access to audit logs for authorized users.
"""

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.utils.dependencies import AuditorUser

router = APIRouter()


# Pydantic model for audit log response
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict


class AuditLogResponse(BaseModel):
    """Schema for audit log response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: Optional[int]
    action: str
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    tx_hash: Optional[str]
    created_at: datetime


class AuditLogList(BaseModel):
    """Schema for paginated audit logs."""
    logs: List[AuditLogResponse]
    total: int
    page: int
    per_page: int


@router.get(
    "/logs",
    response_model=AuditLogList,
    summary="Get audit logs",
    description="Get paginated audit logs. Requires ADMIN or AUDITOR role."
)
async def get_audit_logs(
    current_user: AuditorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    user_id: Optional[int] = Query(None, description="Filter by user ID")
) -> AuditLogList:
    """
    Get paginated audit logs.
    
    Query parameters:
    - **page**: Page number (default: 1)
    - **per_page**: Items per page (default: 50, max: 100)
    - **action**: Filter by action type (e.g., "vote.cast", "user.login")
    - **user_id**: Filter by specific user ID
    
    Requires ADMIN or AUDITOR role.
    """
    # Build query
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    
    if action:
        query = query.where(AuditLog.action == action)
    
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    
    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(AuditLog)
    if action:
        count_query = count_query.where(AuditLog.action == action)
    if user_id:
        count_query = count_query.where(AuditLog.user_id == user_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return AuditLogList(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get(
    "/logs/actions",
    response_model=List[str],
    summary="Get available action types",
    description="Get list of unique action types in audit logs."
)
async def get_action_types(
    current_user: AuditorUser,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[str]:
    """Get list of unique action types for filtering."""
    result = await db.execute(
        select(AuditLog.action).distinct()
    )
    actions = result.scalars().all()
    return list(actions)
