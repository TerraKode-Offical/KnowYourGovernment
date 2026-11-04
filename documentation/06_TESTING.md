# 06 — Testing

## Layers

| Layer | Tool | Location | Command |
|---|---|---|---|
| Unit | Vitest | `src/lib/__tests__/` | `npm test` |
| Types | TypeScript | whole repo | `npm run typecheck` |
| Lint | ESLint 9 (flat) | whole repo | `npm run lint` |
| API contract | Playwright | `e2e/api.spec.ts` | `npm run test:e2e:api` |
| UI / a11y | Playwright + axe | `e2e/*.spec.ts` | `npm run test:e2e` |

E2E targets the live site by default. Override with `E2E_BASE_URL`:

```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Current baseline

```
53 unit tests        (5 files)
23 API contract tests
49 UI tests          (Chromium; 2 skipped)
0 TypeScript errors
0 lint errors
0 production vulnerabilities (npm audit --omit=dev)
```

## Unit coverage

- `errors.test.ts` — `AppError` hierarchy, `toJSON`, `toLogObject`
- `api-error-handler.test.ts` — error mapping (Prisma, Anthropic, network, generic)
- `error-logger.test.ts` — structured logs, PII awareness
- `request-guard.test.ts` — origin/CSRF, JSON content type, body cap, honeypot,
  client error-message extraction

## API contract suite

Covers: health, bills pagination/limit cap, invalid enums → 400, unknown state →
404, search validation, SCOTUS term validation, district/polling validation,
subscribe validation, local endpoints, AI/cron auth (401), manual-cron 403,
image proxy, CSP beacon, sitemap, subscribe rate limit (429).

## Manual checklist before a launch

- [ ] `/`, `/bills`, `/elections`, `/judicial`, `/local`, `/polling-places` load
- [ ] A state hub: `/state/MI` and all six sub-pages
- [ ] A bill detail, a case detail, a justice profile, a candidate profile
- [ ] `/compare` with two candidates
- [ ] `/search?q=healthcare`
- [ ] `/api/health?verbose=1` shows recent timestamps
- [ ] Cron: run `sync-elections` manually → 200 + `DataSyncLog` row
- [ ] 404 route returns a real 404
- [ ] No horizontal overflow at 390 px width
- [ ] `docker logs <app-container>` has no unexpected errors

## Adding tests

- **Unit:** put pure-logic tests in `src/lib/__tests__/<module>.test.ts`.
  Vitest is scoped to `src/**` so Playwright specs are not collected.
- **API:** add to `e2e/api.spec.ts`; assert status **and** body shape.
- **UI:** add a route to `e2e/routes.ts` so the smoke suite covers it.

## CI expectations

A change is ready when `typecheck`, `lint`, `test` and `test:e2e:api` pass.
Do not merge with a failing test; fix the cause rather than skipping.
