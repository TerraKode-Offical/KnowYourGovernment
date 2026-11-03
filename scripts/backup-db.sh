#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# InformedVoter — Nightly PostgreSQL backup (run on iv-data)
# Custom-format pg_dump, gzip, 14-day rotation, optional offsite copy.
#
#   /opt/informedvoter/scripts/backup-db.sh
#
# Offsite (optional): set OFFSITE_TARGET to an rsync destination, e.g.
#   OFFSITE_TARGET="user@nas:/backups/informedvoter"
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/informedvoter}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-iv-postgres}"
DB_USER="${DB_USER:-informedvoter}"
DB_NAME="${DB_NAME:-informedvoter}"
OFFSITE_TARGET="${OFFSITE_TARGET:-}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/${DB_NAME}-${STAMP}.dump.gz"

umask 077
mkdir -p "${BACKUP_DIR}"

echo "[backup] Dumping ${DB_NAME} → ${OUT}"
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -Fc --no-owner "${DB_NAME}" | gzip -1 > "${OUT}"

# Verify non-empty + gzip integrity
if [ ! -s "${OUT}" ] || ! gzip -t "${OUT}"; then
    echo "[backup] ERROR: dump failed integrity check" >&2
    exit 1
fi
echo "[backup] OK ($(du -h "${OUT}" | cut -f1))"

# Rotate local
find "${BACKUP_DIR}" -name "${DB_NAME}-*.dump.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[backup] Rotated (kept ${RETAIN_DAYS} days)"

# Offsite (optional)
if [ -n "${OFFSITE_TARGET}" ]; then
    echo "[backup] Copying offsite → ${OFFSITE_TARGET}"
    rsync -az --remove-source-files "${OUT}" "${OFFSITE_TARGET}/"
fi
