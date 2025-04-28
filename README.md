# Playbook Insights  
![License: MIT](https://img.shields.io/badge/License-MIT-blue) [![Docker](https://img.shields.io/badge/docker-ready-blue)]

## Overview  
Playbook Insights is an open-source NFL analytics and data visualization platform. It provides fans, analysts, fantasy players, and developers with interactive charts, REST API GET endpoints, and historical game logs—all in one place.

- **Goal**: Make NFL data accessible, interactive, and open.  
- **Audience**: NFL fans, fantasy players, data analysts, developers.  
- **Roadmap**:  
  1. Core player/team/game GET endpoints  
  2. Ingestion from NFL sources  
  3. React-based dashboard & filters  
  4. Web and Mobile User Experience
  5. Advanced position based analytics 
- **Competing**: NFL FastR, nflverse, SportsDataIO (closed)

## Features  
- NFL player & team stats (passing, rushing, receiving, defense)  
- Historical game logs (2000–present)  
- Defensive matchup analytics by position  
- REST API GET endpoints 
- React UI for data exploration  
- Dockerized deployment


# Project Architecture

Playbook Insights is structured into three main components—**Aggregator**, **API**, and **Frontend**—working together to deliver a full-stack NFL analytics platform. Everything is containerized for easy deployment via Docker Compose.

## Architecture Overview
```
.
├── Aggregator/            # Python-based data ingestion and processing
├── API/                   # Node.js/TypeScript backend (Express server)
├── Frontend/              # React/TypeScript frontend (Vite + React)
├── Database/              # Pre-built PostgreSQL database backups
├── docs/                  # API documentation
├── initdb/                # SQL scripts to create initial databases
├── postgres-data/         # Persistent Docker volume for PostgreSQL
├── docker-compose.yml     # Compose file to orchestrate services
├── dockerfile             # Base Dockerfile (deprecated, moved to services)
├── entrypoint.sh          # Entrypoint script for service startup
├── nginx.conf             # Nginx configuration (for production proxy)
├── install.sh             # One-command install script
└── README.md              # This documentation
```

## Components

### Aggregator (Python Ingestion Service)
- **Location**: `Aggregator/`
- **Purpose**: Fetches NFL player and team data from external sources, processes it, and loads it into the database.
- **Main Entry Point**: `data_ingestion/main.py`
- **Subdirectories**:
  - `player_data/`, `team_data/`: Organized modules for ingesting different types of data.
  - `utils.py`: Helper functions for cleaning and structuring raw data.
- **Key Technology**: Python 3.9+, `requests`, `psycopg2` for database operations.

### API (Node.js/TypeScript Backend)
- **Location**: `API/`
- **Purpose**: Exposes a RESTful API for retrieving player, team, and game data. Acts as the main server.
- **Main Entry Point**: `src/server.ts`
- **Key Modules**:
  - `routes/`: Organized by feature (search, player stats, team stats).
  - `config/`: Environment config (e.g., database credentials).
  - `helpers/`: Shared utilities like request logging and validation.
- **Testing**: Jest-based unit and integration tests under `__tests__/`.
- **Key Technology**: Node.js 18+, Express.js, TypeScript, PostgreSQL.

### Frontend (React Dashboard)
- **Location**: `Frontend/`
- **Purpose**: User-facing dashboard to search, view, and analyze NFL player and team data.
- **Main Entry Point**: `src/main.tsx`
- **Subdirectories**:
  - `components/`: Reusable UI components.
  - `pages/`: Core application views (e.g., Search, Team View, Player View).
  - `services/`: Handles API calls to the backend.
- **Key Technology**: React 18, TypeScript, Vite, Tailwind CSS (optional styling).

### Database
- **Location**: `Database/` and `postgres-data/`
- **Purpose**: Persistent data storage via PostgreSQL.
- **Setup**:
  - `playbook_insights_player_db.backup` and `playbook_insights_team_db.backup`: Prebuilt database backups.
  - `initdb/01-create-databases.sql`: SQL script to create databases automatically at container start.

## Infrastructure

- **docker-compose.yml**: Spins up all services (Aggregator, API, Frontend, Database) as interconnected containers.
- **nginx.conf**: (Optional) Proxy server configuration for SSL termination and URL routing in production deployments.
- **entrypoint.sh**: Orchestrates startup tasks inside containers (e.g., restoring databases, migrating data).
- **install.sh**: Quick install script that automatically pulls, builds, and runs everything.

## Quick Start

### Requirements  
- Docker & Docker Compose  
- Node.js ≥16  
- Python ≥3.9  
- PostgreSQL ≥13  

# Docker Compose Overview

Playbook Insights is fully containerized — the **frontend**, **backend**, **data aggregator**, and **PostgreSQL database** all run inside a **single Docker container**.

This keeps everything local, fast, and avoids external hosting costs.

Here’s an overview of the provided `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      args:
        VITE_API_URL: http://localhost:5080/api  # Frontend connects to API
    volumes:
      - ./Database:/docker-entrypoint-database  # Database initialization scripts (if needed)
    container_name: playbook-insights
    ports:
      - "5080:5080"   # Frontend available at http://localhost:5080
      - "3000:3000"   # API server available at http://localhost:3000
      - "5000:5000"   # Aggregator service port (reserved)
      - "5432:5432"   # Internal PostgreSQL database port
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      PLAYER_DB_NAME: playbook_insights_player_db
      TEAM_DB_NAME: playbook_insights_team_db
      POSTGRES_HOST: 127.0.0.1  # Database runs inside the same container
      POSTGRES_PORT: 5432
      PLAYER_DATABASE_URL: postgresql://myuser:mypassword@127.0.0.1:5432/playbook_insights_player_db
      TEAM_DATABASE_URL: postgresql://myuser:mypassword@127.0.0.1:5432/playbook_insights_team_db
      DB_SERVER_HOSTNAME: 127.0.0.1
      DB_SERVER_PORT: 5432
      DB_SERVER_USERNAME: myuser
      DB_SERVER_PASSWORD: mypassword
      API_PORT: 3000
      NODE_ENV: production
    restart: always
```

## Key Points

- **Everything inside one container**: No external PostgreSQL server is needed.
- **Ports exposed**:
  - `5080`: Frontend (React UI)
  - `3000`: Backend (API server)
  - `5000`: Data ingestion / aggregator (optional)
  - `5432`: PostgreSQL database (for optional external connections)
- **Environment Variables**:
  - Configure database names, credentials, and API settings.
  - Use `127.0.0.1` to ensure internal container communication.
- **Volumes**:
  - `./Database` can store initial database setup scripts (optional for first-time setup).

## Running the App with Docker Compose

```bash
git clone https://github.com/yourusername/playbook-insights.git
cd playbook-insights
docker-compose up --build
```

Then access:
- Frontend UI: [http://localhost:5080](http://localhost:5080)  
- API Server: [http://localhost:3000](http://localhost:3000)

## Notes

- The included PostgreSQL database is **optimized for local development** and **self-contained**.
- For production deployment, you can adjust the environment variables to point to an external PostgreSQL database if needed.

# Manual Setup  
```bash
# Backend
cd API
npm install
cp .env.example .env
npm run build
npm start

# Aggregator
cd ../Aggregator
pip install -r requirements.txt
python scripts/ingest_data.py

# Frontend
cd ../Frontend
npm install
npm run dev
```

### Home Page
<img width="1512" alt="Screenshot 2025-04-24 at 10 03 32 AM" src="https://github.com/user-attachments/assets/34fcb5a4-4447-429e-a92b-2666bbf4eb68" />

### Example Player stats
<img width="1512" alt="Screenshot 2025-04-24 at 10 05 13 AM" src="https://github.com/user-attachments/assets/bad88ac6-d59e-42a6-ac72-c4cea133203a" />

### Example Team stats
<img width="1512" alt="Screenshot 2025-04-24 at 10 05 42 AM" src="https://github.com/user-attachments/assets/3894671c-0103-4d50-b852-3c9c0f27045b" />



## Example API Usage  

```bash
# Check status
curl http://localhost:3000/status

# List routes
curl http://localhost:3000/routes

# Search players
curl "http://localhost:3000/search?name=Brady"

# Get player passing stats
curl -H "x-entity-type: player" -H "x-stats-type: passing" \
  "http://localhost:3000/?id=00-0019596&season=2023&week=5"
```

```python
import requests

# Status
print(requests.get("http://localhost:3000/status").json())

# Search teams
print(requests.get("http://localhost:3000/search-team", params={"query":"Patriots"}).json())

# Player passing stats
headers = {"x-entity-type":"player","x-stats-type":"passing"}
params = {"id":"00-0019596","season":2023,"week":5}
print(requests.get("http://localhost:3000/", headers=headers, params=params).json())
```


## License  
This project is licensed under the MIT License.


## Full API Documentation  
See [docs/API.md](docs/API.md) for complete reference.  
