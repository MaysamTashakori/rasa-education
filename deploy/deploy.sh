#!/usr/bin/env bash
# Deploys/updates Rasa Education on a Docker host: ./deploy/deploy.sh   (port via RASA_PORT, default 8740)
set -euo pipefail
PORT="${RASA_PORT:-8740}"
NAME="${RASA_NAME:-rasa-education}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$DIR" pull --ff-only --quiet || echo "warn: git pull failed; deploying current checkout"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped --memory 96m -p "$PORT:80" \
  -v "$DIR/dist:/srv:ro" -v "$DIR/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.27-alpine >/dev/null
sleep 2
curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null && echo "rasa-education is up on port $PORT ($(git -C "$DIR" rev-parse --short HEAD))"
