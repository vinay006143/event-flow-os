#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_FILE="${BACKUP_DIR}/eventflow_${TIMESTAMP}.archive.gz"

mkdir -p "${BACKUP_DIR}"
docker exec eventflow-mongo mongodump --db eventflow_os --archive --gzip > "${TARGET_FILE}"
echo "MongoDB backup created at: ${TARGET_FILE}"
