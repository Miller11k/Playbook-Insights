# Use a lightweight Debian-based image
FROM debian:bullseye-slim

# Accept build arguments
ARG VITE_API_URL

# Install system dependencies, Node.js 20.x, and PostgreSQL 17
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    lsb-release \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    gcc \
    libpq-dev \
    netcat \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg \
    && echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y postgresql-17 postgresql-client-17 \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project folders into container
COPY API /app/API
COPY Aggregator /app/Aggregator
COPY Frontend /app/Frontend

# Copy database init scripts
COPY initdb /docker-entrypoint-initdb.d

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Install and build API
WORKDIR /app/API
RUN npm install && npm run build

# Install and set up Aggregator
WORKDIR /app/Aggregator
RUN python3 -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# Install and build Frontend
WORKDIR /app/Frontend
RUN npm install && \
    VITE_API_URL=$VITE_API_URL npm run build

# Expose necessary ports
EXPOSE 5080
EXPOSE 3000
EXPOSE 5000
EXPOSE 5432

# Start all services
CMD ["/entrypoint.sh"]