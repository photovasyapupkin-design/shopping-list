# Secure Shopping List App Plan

## Summary

Build a public GitHub repo named `shopping-list` containing a secure full-stack app on Next.js App Router + TypeScript + shadcn/ui. Deploy target is Vercel free tier, with Neon Postgres via Vercel Marketplace, Resend for email OTP, Better Auth for email/Google auth, and a remote MCP endpoint on the same app domain.

Use per-list roles: any registered user can create a list and becomes that list's admin; admins can share/delete lists; editors can add/update/delete items; viewers can only read.

## Key Changes

- Scaffold `Next.js` with `npm`, Tailwind, shadcn/ui, Drizzle ORM, Better Auth, Vitest, Playwright, and GitHub Actions.
- Add database schema for shopping lists, list members, list items, generated Better Auth tables, and OAuth provider tables.
- Configure Better Auth with email OTP, Google sign-in, Drizzle adapter, rate limiting, and OAuth 2.1 provider support for MCP clients.
- Add remote MCP endpoint at `/mcp` using Streamable HTTP with tools: `list_shopping_lists`, `get_shopping_list`, `create_shopping_list`, `rename_shopping_list`, `delete_shopping_list`, `add_item`, `update_item`, `delete_item`, `share_list`.
- Add OAuth scopes: `lists:read`, `lists:create`, `lists:update`, `lists:delete`, `lists:share`.
- Add MCP discovery/security endpoints and behavior: protected resource metadata, authorization server metadata, dynamic client registration, PKCE, exact redirect URI validation, scoped consent, audience/resource validation, `401`/`403` scope challenges.

## Security Model

- Never trust client-supplied role/user data; all mutations go through server-side authorization checks.
- Enforce both OAuth scopes and per-list membership roles for MCP calls.
- Sharing is only with already registered users by email.
- Admin can assign only `editor` or `viewer` in v1.
- Editor can item CRUD but cannot delete/share lists or manage members.
- Viewer is read-only.
- Use Zod validation, CSRF-safe server mutations, secure cookies, no token passthrough, and tests for every role/scope boundary.

## Test Plan

- Unit tests for the full permission matrix: admin/editor/viewer/non-member plus OAuth scope combinations.
- DB integration tests on GitHub Actions using a Postgres service container and Drizzle migrations.
- Auth tests with mocked email OTP sender; Google OAuth is configuration-tested, not live-tested in CI.
- MCP tests for discovery metadata, DCR, missing token, invalid audience, insufficient scope, and successful tool calls.
- UI tests for list CRUD, item CRUD, sharing dialog, role display, and read-only viewer states.
- CI runs `npm ci`, typecheck, lint, tests, build, and high-severity dependency audit.

## Deployment And Repo Defaults

- GitHub repo: public `shopping-list`.
- Deployment: Vercel Git integration for preview/production deploys.
- Database: Neon Postgres because Vercel's current Postgres path is marketplace-backed, and Neon starts at `$0`.
- Email: Resend free tier via Vercel Marketplace, using `RESEND_API_KEY`.
- Current local machine has Node/npm but no `gh`, `vercel`, or `wrangler`; implementation should use `npx` where possible and request auth/setup only when publishing/deploying requires it.

## References

- MCP latest auth spec: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- MCP security guidance: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- Better Auth OAuth provider: https://better-auth.com/docs/plugins/oauth-provider
- Better Auth email/Google auth: https://better-auth.com/docs/basic-usage
- Vercel Postgres/Neon: https://vercel.com/docs/postgres
- Resend on Vercel: https://vercel.com/marketplace/resend
