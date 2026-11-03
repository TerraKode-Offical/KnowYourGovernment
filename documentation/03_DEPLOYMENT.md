# 03 — Deployment

Self-hosted on Proxmox with two VMs. No managed platform, no serverless.

## Topology

| VM | Addresses | Runs |
|---|---|---|
| `iv-app` (VMID 264) | mgmt `10.10.10.130`, VLAN 100 `10.10.100.117`, VPC `10.39.112.19` | Caddy, Next.js app, Umami |
| `iv-data` (VMID 265) | mgmt `10.10.10.131`, VPC `10.39.112.20` | PostgreSQL 17, Redis 7 |

Ingress: `Cloudflare (proxied, Full strict)` → `50.184.245.19:80/443`
(source-locked to Cloudflare ranges) → `10.10.100.117` → Caddy → app.

## First-time setup

### 1. Data tier (`iv-data`)

```bash
cd /opt/informedvoter
cp .env.data.example .env          # set DB_PASSWORD / REDIS_PASSWORD
docker compose -f docker-compose.data.yml up -d
```

The compose file binds Postgres/Redis to `10.39.112.20` only.

### 2. Application tier (`iv-app`)

```bash
cd /opt/informedvoter
cp .env.example .env               # fill in every required value
docker compose -f docker-compose.app.yml up -d --build
docker compose -f docker-compose.app.yml exec -T app npx prisma db push
docker compose -f docker-compose.app.yml exec -T app npx tsx prisma/seed.ts
```

### 3. TLS

Mount a Cloudflare Origin CA certificate covering every domain at
`docker/certs/civicsites.pem` and `.key` (never committed). Caddy serves all
domains from one certificate; Cloudflare SSL mode must be **Full (strict)**.

### 4. Cron

```bash
CRON_SECRET=<secret> ./scripts/cron-setup.sh
```

The script creates `/var/log/informedvoter-cron.log` owned by the crontab user
and installs 15 jobs with `--max-time 900`.

### 5. Backups (`iv-data`)

```bash
sudo mkdir -p /var/backups/informedvoter
sudo chown "$USER" /var/backups/informedvoter
sudo tee /etc/cron.d/informedvoter-backup >/dev/null <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
15 2 * * * <user> /opt/informedvoter/scripts/backup-db.sh >> /var/log/informedvoter-backup.log 2>&1
EOF
```

## Routine deploy

```bash
# on iv-app
./scripts/deploy.sh
```

`deploy.sh` does: `git pull --ff-only` → `docker compose up -d --build` →
`prisma db push` → health check → image prune.

Manual equivalent:

```bash
cd /opt/informedvoter
git pull --ff-only
docker compose -f docker-compose.app.yml up -d --build
curl -fsS http://localhost:3000/api/health
```

## Environment

See [`.env.example`](../.env.example). Minimum for a working site:
`DATABASE_URL`, `REDIS_URL`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`.
Add `CONGRESS_GOV_API_KEY`, `FEC_API_KEY`, `GOOGLE_CIVIC_API_KEY` for data.
`ANTHROPIC_API_KEY`, `RESEND_API_KEY` and `COURTLISTENER_API_TOKEN` are optional
and degrade gracefully.

## Domains

`knowyourgov.us`, `www.knowyourgov.us`, `govguide.online`,
`governmentmadeclear.com`, `govmadeclear.com`, `knowourgov.com`,
`knowyourgov.online` (plus `www` and the analytics subdomain). All are served by
one Caddy site block and one multi-SAN certificate.

## Rollback

```bash
cd /opt/informedvoter
git log --oneline -5
git checkout <previous-commit>
docker compose -f docker-compose.app.yml up -d --build
```

Schema changes are additive (`prisma db push`); a rollback that removes a column
requires a restore from backup.

## Hardening checklist

- [ ] `.env` is `600` and untracked
- [ ] `docker/certs/` is untracked
- [ ] Postgres/Redis bind only to the VPC address
- [ ] App port bound to `127.0.0.1`
- [ ] Cloudflare SSL mode is Full (strict)
- [ ] Origin DNAT is source-locked to Cloudflare ranges
- [ ] `ALLOW_MANUAL_CRON` is unset
- [ ] Nightly backup cron installed and a restore has been tested
