#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-backup.archive.gz>"
  exit 1
fi

ARCHIVE_FILE="$1"
docker exec -i eventflow-mongo mongorestore --archive --gzip --drop < "${ARCHIVE_FILE}"
echo "MongoDB restore completed from: ${ARCHIVE_FILE}"
