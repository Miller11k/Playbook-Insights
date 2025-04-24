# API Reference
## Manual Startup Guide

### Prerequisites
- Node.js ≥16  
- PostgreSQL ≥13  
- Environment variables (create a `.env` file in the `API/` folder):
  - `DB_SERVER_HOSTNAME`
  - `DB_SERVER_PORT`
  - `DB_SERVER_USERNAME`
  - `DB_SERVER_PASSWORD`
  - `TEAM_DB_NAME`
  - `PLAYER_DB_NAME`
  - `API_PORT` (optional, defaults to 3000)
  - `RATE_LIMIT` (optional, defaults to 100)

### Steps
```bash
# 1. Navigate to the API folder
cd API

# 2. Install dependencies
npm install

# 3. Copy example env and configure credentials
touch .env

# 4. Start the server
npm start
```

## Table of Contents
1. [System Endpoints](#system-endpoints)  
2. [Search Endpoints](#search-endpoints)  
3. [Data Endpoint (GET `/`)](#data-endpoint-get-)  
   - [Headers & Query Parameters](#headers--query-parameters)  
   - [Player Stats Types](#player-stats-types)  
   - [Team Stats Types](#team-stats-types)  
4. [Examples](#examples)  

---

## System Endpoints

### GET /status  
**Summary**: Check API health.  
    curl http://localhost:3000/status  

**Response (200)**:  
    { "status": "ok" }  

### GET /routes  
**Summary**: List all available routes.  
    curl http://localhost:3000/routes  

**Response (200)**:  
    [
      "/status",
      "/routes",
      "/test-db",
      "/search",
      "/search-team",
      "/"
    ]  

### GET /test-db  
**Summary**: Test database connectivity.  
    curl http://localhost:3000/test-db  

**Response (200)**:  
    { "database": "connected" }  

---

## Search Endpoints

### GET /search?name={term}  
**Summary**: Search for players by name.  
- Query Param  
  - name (string, min length 2)  

    curl "http://localhost:3000/search?name=Brady"  

**Response (200)**:  
    [
      { "id": "00-0019596", "name": "Tom Brady" },
      { "id": "00-0012345", "name": "Charlie Brown" }
    ]  

**Error (400)**:  
    { "error": "Search term must be at least 2 characters long." }  

### GET /search-team?query={term}  
**Summary**: Search for teams by name.  
- Query Param  
  - query (string, min length 2)  

    curl "http://localhost:3000/search-team?query=Patriots"  

**Response (200)**:  
    [
      { "id": "NE", "name": "New England Patriots" }
    ]  

**Error (400)**:  
    { "error": "Query term must be at least 2 characters long." }  

---

## Data Endpoint (GET `/`)

All detailed data requests use GET `/` with headers and query parameters.

### Headers & Query Parameters  
- Required Headers:  
    • x-entity-type: "player" or "team"  
    • x-stats-type: see below  
- Player query params (in URL):  
    • id (string, e.g. "00-0019596")  
    • optional: season (YYYY), week (1–22), opponent (team ID)  
- Team query params (in URL):  
    • team (string, e.g. "NE")  
    • optional: season, week, opponent  

### Player Stats Types  
- extra  
- info  
- passing  
- receiving  
- rushing  

### Team Stats Types  
- results  
- defensive  
- info  
- offensive  
- passing  
- receiving  
- record  
- roster  
- rushing  
- special  

---

## Examples

1. **Check Status**  
    curl http://localhost:3000/status  

2. **Search Player**  
    curl "http://localhost:3000/search?name=Brady"  

3. **Fetch Player Passing Stats**  
    curl -H "x-entity-type: player" -H "x-stats-type: passing" \
      "http://localhost:3000/?id=00-0019596&season=2023&week=5"  

4. **Search Team**  
    curl "http://localhost:3000/search-team?query=Patriots"  

5. **Fetch Team Defensive Stats**  
    curl -H "x-entity-type: team" -H "x-stats-type: defensive" \
      "http://localhost:3000/?team=NE&season=2023&week=5"  
