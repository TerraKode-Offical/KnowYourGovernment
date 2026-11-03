# KnowYourGov

**Your government, in plain English.**

A nonpartisan civic-information platform covering Congress, the Supreme Court,
federal agencies, campaign finance, elections, and local government. Data is
pulled from official government APIs and rendered with plain-language
explanations — no spin, no tracking, no account required.

**Live:** [knowyourgov.us](https://knowyourgov.us)

---

## What it does

| Area | What you get |
|---|---|
| **Congress** | Members, bills, votes, cosponsors, and plain-English bill summaries with rider detection |
| **Elections** | 2026 races, FEC-registered challengers, polling places, deadlines, and voter ID rules |
| **Campaign finance** | Top donors, industry breakdowns, spending, contribution sizes, independent expenditures |
| **Supreme Court** | Justices, cases, vote breakdowns, and plain-English impact analysis |
| **Federal agencies** | Directory with live budget authority from USAspending.gov |
| **Local government** | City council meetings, agendas, and first-amendment speaking rules |
| **State hubs** | Senators, representatives, governor, bills, elections, and voter info per state |

Every page is server-rendered, accessible, and works without JavaScript for core
content.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL 17 via Prisma 5.22 |
| Cache / rate limit | Redis 7 (`ioredis`) |
| AI (optional) | Anthropic Claude (`claude-haiku-4-5`, `claude-sonnet-4-5`) |
| Email (optional) | Resend |
| Hosting | Self-hosted Proxmox: `iv-app` + `iv-data`, Docker Compose, Caddy, Cloudflare |

Optional integrations degrade gracefully: without an Anthropic key the AI
features are hidden and cron jobs skip; without a Resend key the subscribe UI
is hidden and the API returns `503`.

---

## Architecture

```
                    Cloudflare (proxied, Full strict)
                                |
                    Caddy (TLS, Cloudflare Origin CA)
                                |
                  Next.js standalone container (iv-app)
                   |            |              |
              Prisma        ioredis        Anthropic / Resend
                   |            |           (optional, outbound)
                   v            v
        PostgreSQL 17     Redis 7
             (iv-data, VPC 10.39.112.20 only — never public)
```

Host cron on `iv-app` calls `/api/cron/*` with a Bearer secret. Every job writes
an audit row to `DataSyncLog`; `/api/health?verbose=1` reports per-job freshness.

---

## Quick start

**Prerequisites:** Node 22+, Docker (for Postgres/Redis), npm.

```bash
# 1. Install
npm ci

# 2. Start local dependencies
docker run -d --name kyv-pg -p 5432:5432 \
  -e POSTGRES_USER=informedvoter -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=informedvoter postgres:17-alpine

docker run -d --name kyv-redis -p 6379:6379 redis:7-alpine

# 3. Configure
cp .env.example .env
#    Set at minimum:
#      DATABASE_URL="postgresql://informedvoter:dev@localhost:5432/informedvoter"
#      REDIS_URL="redis://localhost:6379"
#      CRON_SECRET="$(openssl rand -hex 32)"

# 4. Create the schema and seed reference data
npm run db:push
npm run db:seed

# 5. Run
npm run dev            # http://localhost:3000
```

To populate real data, run the sync jobs (they need API keys):

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/sync-members
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/sync-bills
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/sync-candidates
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes (prod) | Rate limiting + distributed locks; fails open if absent |
| `CRON_SECRET` | yes | Bearer secret for `/api/cron/*` and `/api/ai/*` |
| `NEXT_PUBLIC_BASE_URL` | yes | Canonical origin (metadata, email links, CSRF checks) |
| `CONGRESS_GOV_API_KEY` | for bills/members | Congress.gov v3 |
| `FEC_API_KEY` | for finance/candidates | OpenFEC |
| `GOOGLE_CIVIC_API_KEY` | for polling places | Google Civic Information API |
| `COURTLISTENER_API_TOKEN` | optional | Justice financial disclosures |
| `ANTHROPIC_API_KEY` | optional | AI summaries, rider detection, speaking templates |
| `RESEND_API_KEY` | optional | Verification + digest email |
| `NEXT_PUBLIC_UMAMI_*` | optional | Self-hosted analytics |
| `ALLOW_MANUAL_CRON` | dev only | **Never in production** |

See [`.env.example`](./.env.example) for the full annotated list.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright suite (defaults to the live site) |
| `npm run test:e2e:api` | API contract suite only |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Seed states, elections, justices, agencies |
| `npm run db:studio` | Prisma Studio |

---

## Data sources

| Source | Used for | Schedule |
|---|---|---|
| Congress.gov v3 | Members, bills, votes | Daily |
| OpenFEC | Candidates (2026), campaign finance, PACs | Weekly |
| Google Civic | Elections, polling places, district lookup | Weekly / on demand |
| Oyez | Justices, SCOTUS cases | Daily |
| CourtListener | Justice financial disclosures | Daily (needs token) |
| unitedstates/congress-legislators | Social handles | Weekly |
| Legistar | Local meetings | Daily (needs municipalities) |
| USAspending.gov | Agency budgets | Cached 24 h |

Coverage, known gaps, and verification queries:
[`documentation/02_DATA_SOURCES.md`](./documentation/02_DATA_SOURCES.md).

---

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e:api        # against https://knowyourgov.us by default
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

Current status: **53 unit tests**, **23 API contract tests**, **49 UI tests**
(Chromium), 0 TypeScript errors, 0 lint errors, `npm audit --omit=dev` clean.

---

## Security

- Rate limiting per IP (Redis), strict limits on subscribe and AI endpoints
- Cron endpoints require a constant-time Bearer check at both middleware and handler
- Same-origin + JSON + size caps + honeypot on all public writes
- `sanitize-html` allowlist for external HTML; JSON-LD escaping
- Strict CSP, HSTS, `frame-ancestors 'none'`, no `X-Powered-By`
- Containers run non-root; database and Redis are VPC-only
- Nightly encrypted-at-rest-by-host database backups with 14-day rotation

Full review: [`documentation/security/2026-11-03/`](./documentation/security/2026-11-03/).
To report a vulnerability, see [`SECURITY.md`](./SECURITY.md).

---

## Project structure

```
src/
  app/                 Pages + API routes (App Router)
    api/cron/          Scheduled sync + analysis jobs
    api/ai/            On-demand AI endpoints (Bearer auth)
    state/[stateAbbr]/ State hubs
    judicial/          SCOTUS dashboard, cases, justices
    local/             Local government hub
  components/          UI, layout, features, SEO
  lib/                 db, auth, rate-limit, sanitize, AI client, guards
  hooks/               Client hooks
  types/               Shared types
prisma/                Schema + seeds
public/                Static assets, images, .well-known
scripts/               deploy, backup, cron setup, OG image generator
e2e/                   Playwright specs
documentation/         Architecture, data, deployment, ops, security
```

---

## Documentation

| Document | Contents |
|---|---|
| [01 Architecture](./documentation/01_ARCHITECTURE.md) | Request flow, data flow, runtime model |
| [02 Data Sources](./documentation/02_DATA_SOURCES.md) | APIs, schedules, coverage, gaps |
| [03 Deployment](./documentation/03_DEPLOYMENT.md) | Proxmox, Docker, Caddy, cron, backups |
| [04 Operations](./documentation/04_OPERATIONS.md) | Runbooks: sync, restore, rotate secrets |
| [05 Security](./documentation/05_SECURITY.md) | Controls, accepted risks, review history |
| [06 Testing](./documentation/06_TESTING.md) | Test strategy and commands |
| [07 API](./documentation/07_API.md) | Endpoint reference |
| [08 Contributing](./documentation/08_CONTRIBUTING.md) | Conventions and review checklist |

---

## Nonpartisan commitment

KnowYourGov does not endorse candidates, parties, or legislation. Summaries are
generated from primary source text and labelled as AI-assisted. Data provenance
is shown on the page where possible. Corrections are welcome via the contact
page.

## License

See [LICENSE](./LICENSE).
