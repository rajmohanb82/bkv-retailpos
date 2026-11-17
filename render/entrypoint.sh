#!/bin/bash
set -e

PORT="${PORT:-10000}"
echo "=========================================================="
echo " Starting Annavya Food Retail Chain ERP (Render Edition)  "
echo " Target Port: $PORT                                       "
echo "=========================================================="

# 1. Database Provisioning Strategy
if [ -z "$DATABASE_URL" ]; then
    echo "[Render] No external DATABASE_URL found. Launching embedded PostgreSQL 16..."
    PGDATA="/app/pgdata"
    export PGDATA

    # Ensure postgres user owns data directory
    mkdir -p "$PGDATA"
    chown -R postgres:postgres "$PGDATA"

    # Initialize postgres cluster with UTF-8 encoding if not already initialized
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        echo "[Render] Initializing embedded Postgres cluster in $PGDATA (UTF-8)..."
        su - postgres -c "/usr/lib/postgresql/*/bin/initdb -E UTF8 --locale=C -D $PGDATA --auth=trust"
    fi

    # Start PostgreSQL service daemon
    echo "[Render] Starting PostgreSQL daemon..."
    su - postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D $PGDATA -l /tmp/postgresql.log start"

    # Wait until PostgreSQL is fully accepting connections
    echo "[Render] Waiting for PostgreSQL daemon to accept connections..."
    until su - postgres -c "pg_isready" > /dev/null 2>&1; do
        sleep 0.5
    done

    # Create role and UTF-8 database
    su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='annavya'\" | grep -q 1 || psql -c \"CREATE USER annavya WITH SUPERUSER PASSWORD 'annavya_secret';\""
    su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='annavya_erp'\" | grep -q 1 || psql -c \"CREATE DATABASE annavya_erp WITH ENCODING 'UTF8' OWNER annavya;\""

    export DATABASE_URL="postgresql://annavya:annavya_secret@127.0.0.1:5432/annavya_erp"
    echo "[Render] Embedded PostgreSQL started successfully. DATABASE_URL is set."
else
    # Normalize postgres:// to postgresql:// for psycopg3 compatibility
    if [[ "$DATABASE_URL" == postgres://* ]]; then
        export DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
        echo "[Render] Converted DATABASE_URL protocol to postgresql://"
    fi
    echo "[Render] Using external / Render Managed DATABASE_URL."
fi

# 2. Database Schema & Seed Data Bootstrapping
echo "[Render] Running Database Bootstrap Verification..."
python /app/render/db_bootstrap.py

# 3. Launch Unified ERP & Touch Kiosk Web Service
echo "=========================================================="
echo " Launching Unified ERP & Touch Kiosk Web Service on :$PORT"
echo " Health Endpoint: http://0.0.0.0:$PORT/health             "
echo " Kiosk Endpoint:  http://0.0.0.0:$PORT/kiosk              "
echo " ERP Dashboard:   http://0.0.0.0:$PORT/                   "
echo "=========================================================="
exec python -m uvicorn render.unified_server:app --host 0.0.0.0 --port "$PORT"
