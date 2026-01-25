import sys
import os

# Add backend directory to sys.path so we can import 'app'
# Vercel places us in /var/task/api/index.py or similar
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '../backend')
sys.path.append(backend_dir)

from app.main import app

# Vercel expects a handler, but for FastAPI/Uvicorn, the app instance is enough
# if using @vercel/python, it detects 'app' variable.
