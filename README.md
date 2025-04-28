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

<details>
<summary>System Architecture & Directory Tree</summary>

```
.
├── Aggregator/            # Python ingestion & processing
│   ├── data_ingestion/
│   └── main.py
├── API/                   # Node.js/TypeScript Express backend
│   ├── src/
│   └── routes/
├── Frontend/              # React/TypeScript application
│   └── src/
├── docs/                  # API docs (API.md)
├── docker-compose.yml
└── README.md
```
</details>

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
