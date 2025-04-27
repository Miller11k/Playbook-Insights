# Use a lightweight Debian-based image
FROM debian:bullseye-slim

# Accept build arguments
ARG VITE_API_URL

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    gcc \
    libpq-dev \
    netcat \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project folders into container
COPY API /app/API
COPY Aggregator /app/Aggregator
COPY Frontend /app/Frontend

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ---- Install and build API ----
WORKDIR /app/API
RUN npm install && npm run build

# ---- Install and build Aggregator ----
WORKDIR /app/Aggregator
RUN python3 -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# ---- Install and build Frontend ----
WORKDIR /app/Frontend
RUN npm install && \
    VITE_API_URL=$VITE_API_URL npm run build

# ---- Return to main working directory ----
WORKDIR /app

# ---- Run Aggregator Data Ingestion ----
WORKDIR /app/Aggregator/data_ingestion
RUN . /app/Aggregator/venv/bin/activate && cat main.py && python3 main.py

# ---- Return to main working directory ----
WORKDIR /app

# Expose ports
EXPOSE 5080
EXPOSE 3000
EXPOSE 5000

# Start all services
CMD ["/entrypoint.sh"]