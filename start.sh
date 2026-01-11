#!/usr/bin/env sh
set -e

PORT=${PORT:-8888}
WORKERS=${WORKERS:-1}

exec uvicorn src.main:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"
