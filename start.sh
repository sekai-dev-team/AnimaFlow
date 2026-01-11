#!/bin/bash

MODE=${1:-dev}

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo "Error: Invalid mode '$MODE'. Please use 'dev' or 'prod'."
    exit 1
fi

echo "Starting AnimaFlow in '$MODE' mode..."

# Copy env example if .env doesn't exist
if [ ! -f deploy/.env ]; then
    echo "Creating .env from .env.example..."
    cp deploy/.env.example deploy/.env
fi

CMD="docker-compose -f deploy/docker-compose.yml -f deploy/docker-compose.$MODE.yml up -d"

# Add --build if second argument is --build
if [[ "$2" == "--build" ]]; then
    CMD="$CMD --build"
fi

echo "Executing: $CMD"
eval $CMD