# Multi-stage Dockerfile for Hugging Face Spaces

# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend ./
# Bake in the API URL (relative path since we serve from same origin)
ENV VITE_API_URL=/api/v1
RUN npm run build

# Stage 2: Runtime Environment
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Copy from root requirements (standardized location)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
# We copy the 'app' package to /app/app
COPY backend/app ./app

# Copy Frontend Build to Backend Static Folder
COPY --from=frontend-build /app/frontend/dist ./app/static

# Create non-root user (Hugging Face Security)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Expose generic port (HF overrides this, but good practice)
EXPOSE 7860

# Command to run application on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
