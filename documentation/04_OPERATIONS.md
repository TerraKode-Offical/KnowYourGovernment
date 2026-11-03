# 04 — Operations

## Health

```bash
# liveness + database
curl -fsS http://localhost:3000/api/health

# per-job last run + dataset age
curl -fsS "http://localhost:3000/api/health?verbose=1" | jq
```

Healthy output: `status: ok`, `database: true`, recent timestamps for `bills`,
`candidates`, `voterInfo`, `courtCases`, `campaignFinance`.

Container health:

```bash
docker ps --format '{{.Names}} {{.Status}}'
docker logs iv-app --since 30m 2>&1 | grep -i error
```

## Cron

```bash
crontab -l | grep -c api/cron        # expect 15
tail -n 50 /var/log/informedvoter-cron.log
grep CRON /var/log/syslog | grep smsadmin | tail -20
```

Run one job manually (reads the secret from `.env`, never echoes it):

```bash
SECRET=$(grep '^CRON_SECRET=' /opt/informedvoter/.env | cut -d= -f2-)
curl -fsS --max-time 900 -H "Authorization: Bearer $SECRET" \
  http://localhost:3000/api/cron/sync-elections
```

**If jobs stop running:** check that `/var/log/informedvoter-cron.log` is
writable by the crontab owner. A root-owned log makes bash fail the redirect
before `curl` runs — the job fails silently with no log output.

```bash
ls -la /var/log/informedvoter-cron.log       # must be <user>:<user> 640
sudo chown "$(id -un):$(id -gn)" /var/log/informedvoter-cron.log
```

## Rotate `CRON_SECRET`

```bash
cd /opt/informedvoter
NEW=$(openssl rand -hex 32)
sed -i "s|^CRON_SECRET=.*|CRON_SECRET=$NEW|" .env

TMP=$(mktemp); crontab -l > "$TMP"
sed -i "s|^CRON_SECRET=.*|CRON_SECRET=$NEW|" "$TMP"
crontab "$TMP"; rm -f "$TMP"

rm -f .env.bak.*                       # old secrets must not linger
docker compose -f docker-compose.app.yml up -d --force-recreate app
```

Verify without printing the value:

```bash
SECRET=$(grep '^CRON_SECRET=' .env | cut -d= -f2-)
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SECRET" \
  http://localhost:3000/api/cron/sync-elections   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer old" \
  http://localhost:3000/api/cron/sync-elections   # 401
```

## Backups

```bash
# run now
/opt/informedvoter/scripts/backup-db.sh

# list
ls -lh /var/backups/informedvoter/

# restore drill (never into the live database)
docker exec iv-postgres psql -U informedvoter -d postgres -c 'create database iv_restore_test'
gunzip -c /var/backups/informedvoter/<file>.dump.gz \
  | docker exec -i iv-postgres pg_restore -U informedvoter -d iv_restore_test --no-owner
docker exec iv-postgres psql -U informedvoter -d iv_restore_test -t -c 'select count(*) from "Bill"'
docker exec iv-postgres psql -U informedvoter -d postgres -c 'drop database iv_restore_test'
```

Full restore (destructive):

```bash
docker compose -f docker-compose.data.yml stop
docker exec iv-postgres psql -U informedvoter -d postgres -c 'drop database informedvoter'
docker exec iv-postgres psql -U informedvoter -d postgres -c 'create database informedvoter'
gunzip -c <file>.dump.gz | docker exec -i iv-postgres pg_restore -U informedvoter -d informedvoter --no-owner
docker compose -f docker-compose.data.yml start
```

## Incidents

### Site down

1. `docker ps` — are `iv-app` and `iv-caddy` up?
2. `curl http://localhost:3000/api/health` — app or database?
3. `docker logs iv-app --since 15m`
4. If the database is down: `docker compose -f docker-compose.data.yml ps` on `iv-data`.
5. Roll back the last deploy if it started after a release.

### Data looks stale

1. `curl "http://localhost:3000/api/health?verbose=1"` — which job is old?
2. `tail /var/log/informedvoter-cron.log` — permission error or API error?
3. Run the job manually and read the JSON response.
4. Check the upstream status (Congress.gov, OpenFEC, Google Civic).
5. Confirm `DataSyncLog` for the failure detail.

### Rate limiting misbehaving

`checkRateLimit` fails open when Redis is unreachable. Confirm:

```bash
docker exec iv-redis redis-cli -a "$REDIS_PASSWORD" ping   # PONG
```

### Email not arriving

`RESEND_API_KEY` must be set; otherwise `/api/subscribe` returns 503 by design.
Check the app logs for `[resend]` warnings.

## Log locations

| Log | Location |
|---|---|
| Cron | `/var/log/informedvoter-cron.log` |
| Backups | `/var/log/informedvoter-backup.log` |
| App | `docker logs iv-app` |
| Caddy | `docker logs iv-caddy` |
| Postgres | `docker logs iv-postgres` |
