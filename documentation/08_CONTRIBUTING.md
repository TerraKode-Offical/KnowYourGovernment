# 08 — Contributing

## Ground rules

1. **Nonpartisan.** No endorsements, no loaded language, no editorialising.
   AI prompts must instruct the model to stay factual and neutral.
2. **Primary sources.** New data must come from an official API or an official
   published record, and must record provenance where the UI allows it.
3. **Idempotent syncs.** Upsert by an external identifier; never insert blindly.
4. **Graceful degradation.** Optional integrations must fail visibly and safely
   (503 / skip), never silently or with a false success.

## Code conventions

- TypeScript strict; avoid `any`.
- `@/` path alias for `src/`.
- Server Components by default; `"use client"` only when needed.
- 2-space indentation; match the surrounding file.
- Section dividers in long files:

  ```ts
  // ─────────────────────────────────────────────
  // Section
  // ─────────────────────────────────────────────
  ```

- Route handlers: `export const GET = withErrorHandler(async (request) => { ... }, { route })`.
- Never add a local `try/catch` that swallows `AppError`.
- Import Prisma from `@/lib/db` only.

## Adding a page

1. Create `src/app/<route>/page.tsx`.
2. Export `metadata` (or `generateMetadata` for dynamic routes).
3. Handle the empty state explicitly (no blank pages).
4. Add the route to `e2e/routes.ts` so smoke coverage picks it up.

## Adding an endpoint

1. Validate every input (type, enum, length) and throw `ValidationError`.
2. Wrap with `withErrorHandler` (or `withCronErrorHandler` for jobs).
3. If it writes from the browser, use the guards in `src/lib/request-guard.ts`.
4. If it calls an optional integration, gate it with `src/lib/config.ts`.
5. Document it in `documentation/07_API.md`.

## Adding a data source

See the checklist in [`02_DATA_SOURCES.md`](./02_DATA_SOURCES.md#adding-a-source).

## Commits

Conventional prefixes, imperative mood, one concern per commit:

```
feat(api): add candidate comparison endpoint
fix(sync-bills): handle missing sponsor bioguide id
docs(ops): document backup restore drill
chore(deps): bump next to 16.4.5
```

## Pull request checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean (no new warnings)
- [ ] `npm test` green
- [ ] `npm run test:e2e:api` green for API changes
- [ ] No secrets, `.env` files, certificates, or credentials in the diff
- [ ] `npm audit --omit=dev` clean
- [ ] Docs updated when behaviour, env vars, or schedules change
- [ ] Accessibility: labels, focus states, no colour-only meaning
- [ ] Nonpartisan language review for any user-facing copy

## Accessibility baseline

- Semantic landmarks and one `h1` per page.
- Form controls have labels; errors use `role="alert"`.
- Visible `focus-visible` outlines.
- Contrast meets WCAG 2.2 AA.
- The axe scan in `e2e/a11y.spec.ts` must stay clean on `/` and `/local`.
