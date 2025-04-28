#!/bin/bash
set -e

# Set default database variables if not provided
POSTGRES_USER="${POSTGRES_USER:-myuser}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-mypassword}"
POSTGRES_DB_PLAYER="${PLAYER_DB_NAME:-playbook_insights_player_db}"
POSTGRES_DB_TEAM="${TEAM_DB_NAME:-playbook_insights_team_db}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  echo "Initializing PostgreSQL data directory..."
  su - postgres -c "/usr/lib/postgresql/17/bin/initdb -D /var/lib/postgresql/data --encoding=UTF8 --locale=C"
fi

# Start PostgreSQL server
echo "Starting PostgreSQL server..."
su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start"

# Wait for PostgreSQL to be ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U postgres; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

echo "PostgreSQL is up."

# Create user role if it doesn't exist
echo "Creating user role if it does not exist..."
psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = '$POSTGRES_USER'" | grep -q 1 || \
  psql -U postgres -c "CREATE ROLE $POSTGRES_USER LOGIN PASSWORD '$POSTGRES_PASSWORD';"
echo "User role created or already exists."

# Create player and team databases if they don't exist
echo "Creating databases if they do not exist..."
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB_PLAYER'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE $POSTGRES_DB_PLAYER;"
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB_TEAM'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE $POSTGRES_DB_TEAM;"
echo "Databases created if needed."

echo "Checking if databases need to be restored..."

# Restore player database if no user tables exist
PLAYER_TABLE_COUNT=$(psql -U postgres -d "$POSTGRES_DB_PLAYER" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | xargs)
echo "DEBUG: Player database user table count before restore: $PLAYER_TABLE_COUNT"

if [ "$PLAYER_TABLE_COUNT" -eq "0" ]; then
  if [ -f /docker-entrypoint-database/playbook_insights_player_db.backup ]; then
    echo "Restoring player database from backup..."
    pg_restore --no-owner --no-privileges -U postgres -d "$POSTGRES_DB_PLAYER" /docker-entrypoint-database/playbook_insights_player_db.backup
    echo "Player database restore completed."
  else
    echo "Warning: No backup file found for player database."
  fi
else
  echo "Player database already initialized. Skipping restore."
fi

# Restore team database if no user tables exist
TEAM_TABLE_COUNT=$(psql -U postgres -d "$POSTGRES_DB_TEAM" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | xargs)
echo "DEBUG: Team database user table count before restore: $TEAM_TABLE_COUNT"

if [ "$TEAM_TABLE_COUNT" -eq "0" ]; then
  if [ -f /docker-entrypoint-database/playbook_insights_team_db.backup ]; then
    echo "Restoring team database from backup..."
    pg_restore --no-owner --no-privileges -U postgres -d "$POSTGRES_DB_TEAM" /docker-entrypoint-database/playbook_insights_team_db.backup
    echo "Team database restore completed."
  else
    echo "Warning: No backup file found for team database."
  fi
else
  echo "Team database already initialized. Skipping restore."
fi

echo "Waiting for database restores to complete if necessary..."

until [ "$(psql -U postgres -d "$POSTGRES_DB_PLAYER" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | xargs)" -gt 0 ]; do
  echo "Waiting for player database restore to complete..."
  sleep 1
done

until [ "$(psql -U postgres -d "$POSTGRES_DB_TEAM" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | xargs)" -gt 0 ]; do
  echo "Waiting for team database restore to complete..."
  sleep 1
done

echo "Granting privileges to $POSTGRES_USER on player and team databases..."

# Grant privileges on player database
psql -U postgres -d "$POSTGRES_DB_PLAYER" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $POSTGRES_USER;"
psql -U postgres -d "$POSTGRES_DB_PLAYER" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;"
psql -U postgres -d "$POSTGRES_DB_PLAYER" -c "GRANT USAGE, CREATE ON SCHEMA public TO $POSTGRES_USER;"
psql -U postgres -d "$POSTGRES_DB_PLAYER" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $POSTGRES_USER;"

# Grant privileges on team database
psql -U postgres -d "$POSTGRES_DB_TEAM" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $POSTGRES_USER;"
psql -U postgres -d "$POSTGRES_DB_TEAM" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;"
psql -U postgres -d "$POSTGRES_DB_TEAM" -c "GRANT USAGE, CREATE ON SCHEMA public TO $POSTGRES_USER;"
psql -U postgres -d "$POSTGRES_DB_TEAM" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $POSTGRES_USER;"

echo "Privileges granted."

echo "Databases ready. Continuing startup..."

# Start Aggregator (Python ingestion) in background
echo "Starting NFL Data Ingestion..."
/app/Aggregator/venv/bin/python3 /app/Aggregator/data_ingestion/main.py >> /app/aggregator_ingestion.log 2>&1 &
echo "NFL Data Ingestion started in background (logs at /app/aggregator_ingestion.log)."

# Start Nginx
echo "Starting Nginx..."
service nginx start

# Start API Server (keep it in foreground)
echo "Starting API Server..."
cd /app/API
npm run start

# If API server exits, shut down container
echo "API Server exited. Shutting down container..."