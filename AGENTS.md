# Repository Guidelines

## Project Structure & Module Organization
- `src/app` holds the Next.js App Router entry points (`cashier`, `management`, etc.), while `src/components`, `src/lib`, and `src/server/api` house reusable UI, helpers, and tRPC routers.
- Shared server utilities and wiring live under `src/trpc` and `middleware.ts`; keep business logic close to the router that consumes it.
- Prisma lives in `prisma/schema.prisma` with generated client helpers beneath `node_modules/.prisma`; keep migrations in `prisma/migrations`.
- Tests are split across `tests/unit`, `tests/api`, and `tests/e2e`, with fixtures in `data/` and supplemental scripts in `scripts/`.
- Static assets, icons, and seeded content should stay under `public/` or `data/` (e.g., `public/images` for marketing, `data/seed/*.json` for test data).

## Build, Test, and Development Commands
- `pnpm install` installs dependencies; run it before working locally.
- `pnpm run dev` boots the Next.js dev server on port 5000; use it for manual UI or API work.
- `pnpm run build` creates an optimized production bundle; `pnpm run start` serves that bundle for manual smoke tests.
- `pnpm run lint` enforces ESLint rules; run before commits to avoid stylistic regressions.
- `pnpm run typecheck` runs `tsc --noEmit`; use it to catch type drift after major refactors.
- `pnpm run test:unit`, `pnpm run test:e2e`, and `pnpm run test` wind up Vitest and Playwright suites—run the ones relevant to your change.
- Database helpers: `pnpm run db:generate`, `pnpm run db:push`, `pnpm run db:migrate` manage Prisma artifacts; `pnpm run seed:full` or `seed:products` populate sample data.

## Coding Style & Naming Conventions
- TypeScript + React; copy the prevailing 2-space/2-quote formatting, keep JSX clean, and avoid `any`.
- Components are PascalCase, hooks begin with `use`, and route files follow kebab-case (e.g., `product-detail-drawer.tsx`).
- Use path aliases (`@/components/...`, `@/server/api/...`) to keep imports readable.
- Keep logic modular: prefer utility files in `src/lib` or folder-scoped `helpers.ts` rather than sprawling router files.
- Formatting is enforced through ESLint; fix lint failures before pushing.

## Testing Guidelines
- Unit tests (Vitest) live in `tests/unit` or under feature folders with `.test.ts` suffixes; API contracts sit in `tests/api`, e2e flows in `tests/e2e/*.spec.ts`.
- Coverage expectations: add or expand tests whenever you touch business logic, custom hooks, or shared utilities.
- Name tests to reflect the behavior or scenario (e.g., `adjust-stock.test.ts` for inventory adjustments).
- Run the relevant suite(s) locally (`pnpm run test:unit`, `pnpm run test:e2e`) and keep failures addressed before opening a PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat(outlet): ...`, `fix(trpc): ...`, `docs: ...`.
- PRs should include a clear description, linked issue or ticket if available, and QA notes that state which commands were run (`pnpm run lint`, `pnpm run test:unit`, etc.).
- For UI tweaks, mention any manual verification steps and include annotated screenshots if the change touches customer-facing flows.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and never commit secrets; check for Supabase/Prisma entries when pairing new features.
- Guard sensitive routes (e.g., API debug endpoints) behind admin auth and skip them in production (`NODE_ENV !== "production"`).
- When handling outlet-specific data, scope totals to the requester’s outlet, especially in analytics, inventory, and sales contexts.

## Onboarding & Knowledge Sharing
- Start with `README.md` and the quickstart docs (`QUICK_MODE_SUMMARY.md`, `OWNER_DASHBOARD_INDEX.md`) to understand product flows.
- Use `CHECK-LOGS.sh` and `DEBUG-STEPS.md` when investigating runtime issues; follow `DEPLOYMENT.md` when promoting builds.
- Mention any outstanding feature work (promotion engine, task center, RBAC tests) in PR descriptions so reviewers know what remains.
