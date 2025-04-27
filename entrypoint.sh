#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until nc -z db 5432; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

echo "PostgreSQL is up. Starting services..."

# Start Aggregator (Python ingestion) **first** in the background
echo "Starting NFL Data Ingestion..."
/app/Aggregator/venv/bin/python3 /app/Aggregator/data_ingestion/main.py >> /app/aggregator_ingestion.log 2>&1 &
echo "NFL Data Ingestion started in background (logs at /app/aggregator_ingestion.log)."

# Start Nginx
echo "Starting Nginx..."
service nginx start

# Start API (Node.js backend)
echo "Starting API Server..."
cd /app/API
npm run start