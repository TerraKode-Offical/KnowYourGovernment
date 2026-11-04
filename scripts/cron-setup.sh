#!/bin/bash
# ============================================================================
# KnowYourGov - cron installation (host crontab on the app host)
#
#   CRON_SECRET=<secret> ./scripts/cron-setup.sh
#
# Optional overrides: APP_URL (default http://localhost:3000),
#                     LOG_FILE (default /var/log/knowyourgov-cron.log)
#
# IMPORTANT: the log file must be writable by the user that owns the crontab.
# If it is root-owned, bash fails the redirect BEFORE curl runs and every job
# fails silently. This script creates/chowns it correctly.
# ============================================================================

set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"
LOG_FILE="${LOG_FILE:-/var/log/KnowYourGov-cron.log}"
RUN_USER="$(id -un)"

if [ -z "${CRON_SECRET}" ]; then
  echo "ERROR: CRON_SECRET is not set. Generate one with: openssl rand -hex 32" >&2
  exit 1
fi

# One curl invocation per job. --max-time prevents a hung sync from piling up.
job() {
  printf '%s curl -fsS --max-time 900 -H "Authorization: Bearer ${CRON_SECRET}" %s%s >> %s 2>&1\n' \
    "$1" "${APP_URL}" "$2" "${LOG_FILE}"
}

CRON_CONTENT="$(cat <<EOF
# KnowYourGov - host-level cron (on-prem)
# Generated: $(date -Iseconds)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
CRON_SECRET=${CRON_SECRET}
APP_URL=${APP_URL}

# --- Daily data sync ---
$(job '0 4 * * *'  '/api/cron/sync-local-meetings')
$(job '0 5 * * *'  '/api/cron/sync-scotus')
$(job '0 6 * * *'  '/api/cron/sync-members')
$(job '0 7 * * *'  '/api/cron/sync-bills')
$(job '0 8 * * *'  '/api/cron/sync-votes')

# --- Weekly data sync ---
$(job '0 9 * * 1'  '/api/cron/sync-campaign-finance')
$(job '0 10 * * 1' '/api/cron/sync-elections')
$(job '45 10 * * 1' '/api/cron/sync-candidates')
$(job '0 10 * * 3' '/api/cron/sync-pac-contributions')
$(job '30 10 * * 5' '/api/cron/sync-social')

# --- Monthly data sync (1st) ---
$(job '0 11 1 * *' '/api/cron/sync-voter-info')

# --- Daily AI analysis (skips cleanly when ANTHROPIC_API_KEY is unset) ---
$(job '0 12 * * *' '/api/cron/analyze-bills')
$(job '0 13 * * *' '/api/cron/analyze-candidates')
$(job '0 14 * * *' '/api/cron/analyze-cases')

# --- Daily email digest (skips cleanly when RESEND_API_KEY is unset) ---
$(job '0 15 * * *' '/api/cron/send-digest')
EOF
)"

# Create the log with the correct owner (sudo only if needed).
if [ ! -e "${LOG_FILE}" ]; then
  sudo touch "${LOG_FILE}"
  sudo chown "${RUN_USER}:${RUN_USER}" "${LOG_FILE}"
  sudo chmod 640 "${LOG_FILE}"
fi
if [ ! -w "${LOG_FILE}" ]; then
  echo "ERROR: ${LOG_FILE} is not writable by ${RUN_USER}." >&2
  echo "       Fix with: sudo chown ${RUN_USER} ${LOG_FILE}" >&2
  exit 1
fi

echo "${CRON_CONTENT}" | crontab -

echo "Installed $(echo "${CRON_CONTENT}" | grep -c 'api/cron/') jobs for ${RUN_USER}."
echo "Log file: ${LOG_FILE}"
echo ""
echo "Verify (replace <secret> with the value you generated):"
echo "  curl -fsS -H 'Authorization: Bearer <secret>' ${APP_URL}/api/cron/sync-elections"
