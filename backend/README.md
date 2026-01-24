# VoteChainAI Backend

Production-grade FastAPI backend with PostgreSQL and blockchain integration.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Architecture

```
backend/
├── app/
│   ├── main.py          # FastAPI entry
│   ├── config.py        # Environment config
│   ├── database.py      # SQLAlchemy setup
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── api/             # Route handlers
│   ├── services/        # Business logic
│   └── utils/           # Utilities
├── alembic/             # Migrations
└── tests/               # Test suite
```

## Environment Variables

See `.env.example` for required configuration.
