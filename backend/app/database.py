"""
VoteChainAI Database Configuration

SQLAlchemy database setup with SQLite (default) or PostgreSQL support.
"""

import os
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


# Determine database type from URL
is_sqlite = settings.database_url.startswith("sqlite")

if is_sqlite:
    # SQLite configuration (synchronous, simpler for development)
    # Convert async URL to sync for SQLite
    db_url = settings.database_url.replace("sqlite+aiosqlite", "sqlite")
    
    engine = create_engine(
        db_url,
        echo=settings.debug,
        connect_args={"check_same_thread": False}  # Required for SQLite
    )
    
    SessionLocal = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False
    )
    
    async_session_maker = None  # Not used for SQLite
else:
    # PostgreSQL async configuration
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        future=True,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10
    )
    
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    SessionLocal = None  # Not used for PostgreSQL


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator:
    """
    Dependency for getting database sessions.
    
    Yields:
        Database session that auto-closes after use.
    """
    if is_sqlite:
        # SQLite uses sync sessions wrapped in async context
        db = SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    else:
        # PostgreSQL uses true async sessions
        async with async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()


async def init_db() -> None:
    """Initialize database tables."""
    if is_sqlite:
        # SQLite: create tables synchronously
        Base.metadata.create_all(bind=engine)
    else:
        # PostgreSQL: create tables asynchronously
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    if not is_sqlite:
        await engine.dispose()
