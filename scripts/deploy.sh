#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# InformedVoter — Deployment (on-prem, iv-app)
# Pull latest code, rebuild, restart, health check.
#
#   ./scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/informedvoter}"
DOMAIN="${DOMAIN:-knowyourgov.us}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
step()  { echo -e "${BLUE}[STEP]${NC} $1"; }

cd "${APP_DIR}"

step "Pulling latest code..."
git pull --ff-only

if [ ! -f .env ]; then
    error ".env file not found! Copy from .env.example and fill in secrets."
    exit 1
fi

step "Building and starting the application stack..."
docker compose -f docker-compose.app.yml up -d --build

step "Running Prisma schema sync..."
sleep 5
docker compose -f docker-compose.app.yml exec -T app npx prisma db push || \
    warn "prisma db push failed or no changes. Continuing..."

step "Running health check..."
sleep 3
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
if [ "${HEALTH_STATUS}" = "200" ]; then
    info "Health check passed!"
else
    error "Health check failed (HTTP ${HEALTH_STATUS}). Logs: docker compose -f docker-compose.app.yml logs app"
    exit 1
fi

step "Cleaning up old Docker images..."
docker image prune -af --filter "until=168h" || true

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Deploy Complete — https://${DOMAIN}"
echo "═══════════════════════════════════════════════════════════════════════"
