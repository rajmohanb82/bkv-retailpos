# ==============================================================================
# Annavya Food Retail Chain ERP — Render Unified SaaS Container
# Single High-Performance Container for Render Free Tier (512MB RAM Compatible)
# Includes:
#   - Pre-compiled React + Vite Frontend SPA (Full ERP + Touch Kiosk)
#   - Unified FastAPI Server mounting all 8 Microservices under /api/*
#   - Embedded PostgreSQL 16 cluster (zero-config standalone)
#   - Automated remote DATABASE_URL support (Render Managed DB / Neon / Supabase)
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Frontend SPA Production Build
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 2: Python 3.12 Production Runtime with Embedded PostgreSQL Option
# ------------------------------------------------------------------------------
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONPATH=/app/services:/app

WORKDIR /app

# Install PostgreSQL server & client tools for self-contained operation
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install unified backend dependencies
COPY render/requirements.txt /app/render/requirements.txt
RUN pip install --no-cache-dir -r /app/render/requirements.txt

# Copy microservice backends, shared modules and database schema
COPY services/ /app/services/
COPY db/ /app/db/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/dist /app/frontend_dist

# Copy Render startup orchestrators
COPY render/ /app/render/
RUN chmod +x /app/render/entrypoint.sh

# Render defaults to port 10000
EXPOSE 10000

ENTRYPOINT ["/app/render/entrypoint.sh"]
