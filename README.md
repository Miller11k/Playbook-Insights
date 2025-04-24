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

### Using Docker Compose  
```bash
git clone https://github.com/yourusername/playbook-insights.git
cd playbook-insights
docker-compose up --build
```

### Manual Setup  
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
