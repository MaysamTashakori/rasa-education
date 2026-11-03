#!/usr/bin/env bash
# Deploys/updates Rasa Education (Node API + static apps) on a Docker host.
#   RASA_PORT=8740 ./deploy/deploy.sh        data persists in $RASA_DATA (default /opt/rasa-education-data)
set -euo pipefail
PORT="${RASA_PORT:-8740}"
NAME="${RASA_NAME:-rasa-education}"
DATA="${RASA_DATA:-/opt/rasa-education-data}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$DIR" pull --ff-only --quiet || echo "warn: git pull failed; deploying current checkout"
mkdir -p "$DATA"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped --memory 256m -p "$PORT:8080" \
  -e DATA_DIR=/data -e NODE_NO_WARNINGS=1 -v "$DIR:/app:ro" -v "$DATA:/data" -w /app \
  node:24-alpine node server/index.mjs >/dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do sleep 1; curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break; done
curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null && echo "rasa-education is up on port $PORT ($(git -C "$DIR" rev-parse --short HEAD))"
