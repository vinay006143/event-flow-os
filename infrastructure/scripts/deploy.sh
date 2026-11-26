#!/usr/bin/env bash
set -euo pipefail

echo "Deploying EventFlow OS..."
docker compose pull --ignore-pull-failures || true
docker compose build
docker compose up -d
docker compose ps
echo "Checking API health..."
sleep 5
curl -fsS http://localhost/api/v1/system/health || curl -fsS http://localhost:4000/api/v1/system/health
