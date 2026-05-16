# Secure Shopping List App Plan Walkthrough

## Original Plan

Source plan: `plans/secure-shopping-list-app-plan.md`

The plan called for a secure full-stack shopping list app using Next.js App Router, TypeScript, shadcn/ui-style components, Drizzle ORM, Better Auth, Neon Postgres, Resend email OTP, Vercel deployment defaults, and a remote MCP endpoint on the same app domain.

## What Was Done

### Application Foundation

- Scaffolded a Next.js 16 App Router app with TypeScript, Tailwind CSS, ESLint, npm scripts, and route handlers.
- Added lightweight shadcn-compatible UI primitives in `src/components/ui/`.
- Built the main app surface in `src/components/shopping-list-app.tsx`.
- Added local development fallback behavior: when `DATABASE_URL` is absent, the app uses an in-memory repository so the UI and API can be tested immediately.

### Data Model And Persistence

- Added Drizzle configuration in `drizzle.config.ts`.
- Added Postgres schema in `src/lib/db/schema.ts`.
- Generated the first migration in `drizzle/0000_spicy_patch.sql`.
- Modeled Better Auth tables, OAuth/MCP provider tables, shopping lists, list members, and list items.
- Added repository abstraction with both:
  - `src/lib/shopping/memory-repository.ts`
  - `src/lib/shopping/drizzle-repository.ts`

### Authorization And Security

- Added role definitions and permission checks in `src/lib/permissions.ts`.
- Implemented the per-list role model:
  - Admin can read, update, delete, share, and manage items.
  - Editor can read and manage items.
  - Viewer can only read.
- Enforced server-side authorization in `src/lib/shopping/service.ts`.
- Mapped item mutations to the OAuth scope `lists:update`.
- Ensured MCP calls require both OAuth scope and list membership role.
- Added Zod validation for API and MCP inputs.

### Auth And Email

- Added lazy Better Auth setup in `src/lib/auth.ts`.
- Configured:
  - Drizzle adapter
  - email OTP plugin
  - optional Google provider
  - Better Auth MCP plugin
  - rate limiting
- Added Resend integration in `src/lib/email.ts`.
- Local development logs OTPs to the server console when `RESEND_API_KEY` is not present.

### HTTP API

- Added list CRUD route handlers under `src/app/api/lists`.
- Added item create/update/delete routes.
- Added member sharing route.
- Added auth route at `src/app/api/auth/[...all]/route.ts`.

### MCP

- Added MCP metadata helpers in `src/lib/mcp/metadata.ts`.
- Added protected resource metadata endpoint:
  - `/.well-known/oauth-protected-resource`
- Added authorization server metadata endpoint:
  - `/.well-known/oauth-authorization-server`
- Added MCP endpoint at `/mcp`.
- Implemented MCP tools:
  - `list_shopping_lists`
  - `get_shopping_list`
  - `create_shopping_list`
  - `rename_shopping_list`
  - `delete_shopping_list`
  - `add_item`
  - `update_item`
  - `delete_item`
  - `share_list`
- Added development-only MCP bearer format for local testing.

### Testing And CI

- Added Vitest config and unit tests for role/scope authorization.
- Added MCP HTTP tests for missing auth, invalid audience, insufficient scope, and role enforcement.
- Added Playwright config and an e2e smoke test for creating a list and adding an item.
- Added GitHub Actions CI in `.github/workflows/ci.yml`.
- CI runs install, typecheck, lint, unit tests, migration generation, build, and high-severity npm audit.

### Documentation

- Added `.env.example`.
- Added README setup notes for local development, Postgres/Neon, Resend, Better Auth, and MCP.
- Added this walkthrough document.

## Verification Results

The implementation was verified with:

```bash
npm run typecheck
npm run lint
npm test
npm run db:generate
npm run build
npm run e2e
npm audit --audit-level=high
```

Observed results:

- TypeScript passed.
- ESLint passed.
- Vitest passed with 9 tests.
- Drizzle migration generation succeeded.
- Next.js production build succeeded.
- Playwright e2e passed on desktop Chromium and mobile profile.
- `npm audit --audit-level=high` completed with no high-severity findings. Moderate transitive advisories remain in current framework/tooling dependencies.

## Lessons Learned

- Next.js 16/Turbopack may need elevated local permissions in this sandbox because build and dev flows can bind internal worker ports.
- `create-next-app --force` still refused to scaffold into a non-empty directory containing `plans/`, so scaffolding in a temporary directory and copying the generated files preserved the original plan.
- Better Auth's MCP plugin provides useful OAuth endpoints, but the app still needs its own business-level scope and per-list role enforcement at the MCP tool boundary.
- Keeping a repository abstraction made it possible to support immediate local testing without Postgres while still providing a Drizzle-backed path for production.
- Vitest must explicitly exclude Playwright specs, otherwise `npm test` tries to execute `@playwright/test` files in the wrong runner.
- Playwright requires its browser runtime to be installed locally before e2e tests can run.
- Build-safe lazy initialization matters for database and auth modules because Next.js may evaluate server modules during build.

## What Is Left

- Publish the public GitHub repository named `shopping-list`.
- Connect Vercel Git deployment.
- Provision Neon Postgres through Vercel Marketplace and set `DATABASE_URL`.
- Provision Resend through Vercel Marketplace and set `RESEND_API_KEY`.
- Configure Google OAuth credentials and callback URLs.
- Run migrations against the production database.
- Exercise the full Better Auth email OTP and Google sign-in flows against real provider credentials.
- Exercise production MCP OAuth dynamic client registration, authorization code flow, PKCE, consent, and token refresh with a real MCP client.
- Add deeper DB integration tests that run against the GitHub Actions Postgres service.
- Expand UI e2e coverage for sharing, role display, read-only viewer state, item update/delete, and admin-only list delete.
- Replace the development-only MCP bearer shortcut with real tokens in all production-like tests.
