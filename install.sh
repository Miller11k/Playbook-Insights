#!/bin/sh

# Repository info
REPO_URL="https://github.com/Miller11k/Playbook-Insights.git"
REPO_NAME="Playbook-Insights"

# --- Step 0: Check for required commands ---

# Function to print error and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# Check if git is available
if ! command -v git >/dev/null 2>&1; then
    error_exit "Git is not installed. Please install Git and try again."
fi

# Check if docker is available
if ! command -v docker >/dev/null 2>&1; then
    error_exit "Docker is not installed. Please install Docker and try again."
fi

# Check if docker compose is available (as plugin or standalone)
if ! docker compose version >/dev/null 2>&1; then
    if ! command -v docker-compose >/dev/null 2>&1; then
        error_exit "Docker Compose is not installed. Please install Docker Compose and try again."
    fi
    # Use docker-compose instead of docker compose if needed
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# --- Step 1: Clone the repository if necessary ---

# If neither docker-compose.yml nor Dockerfile exist, assume not in repo
if [ ! -f "docker-compose.yml" ] && [ ! -f "Dockerfile" ]; then
    echo "Cloning repository..."
    git clone "$REPO_URL" || error_exit "Failed to clone repository."
    cd "$REPO_NAME" || error_exit "Failed to enter repository directory."
else
    echo "Already in repository directory. Skipping clone."
fi

# --- Step 2: Build and run the container fresh ---

echo "Building and running the container..."
$COMPOSE_CMD up --build --force-recreate
