# Multi-stage Dockerfile for Hugging Face Spaces

# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend ./
# Bake in the API URL
ENV VITE_API_URL=/api/v1
RUN npm run build

# Stage 2: Runtime Environment
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    wget \
    git \
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

# Download Face Models directly (Bypass Git LFS)
# We create the directory and fetch model shards and manifests
RUN mkdir -p app/static/models && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1 -O app/static/models/tiny_face_detector_model-shard1 && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-weights_manifest.json -O app/static/models/tiny_face_detector_model-weights_manifest.json && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1 -O app/static/models/face_landmark_68_model-shard1 && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json -O app/static/models/face_landmark_68_model-weights_manifest.json && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1 -O app/static/models/face_recognition_model-shard1 && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2 -O app/static/models/face_recognition_model-shard2 && \
    wget -q https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json -O app/static/models/face_recognition_model-weights_manifest.json

# Create non-root user
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
