# Multi-stage build for React + FastAPI deployment
FROM node:18-alpine AS frontend-builder

# Add an argument for the React Google Client ID and set it as an env var for the build
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

# Set working directory for frontend build
WORKDIR /frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the React application with environment variables
RUN npm run build

# Python stage for backend
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /frontend/build ./frontend/build

# Expose the port that Cloud Run will use
EXPOSE 8080

# Set environment variable for Cloud Run
ENV PORT=8080

# Run the FastAPI application
CMD ["python", "main.py"]
