# Shopping List

Secure shared shopping lists built with Next.js App Router, TypeScript, Drizzle, Better Auth, and a remote MCP endpoint.

## What Is Implemented

- List roles: admin, editor, viewer.
- Server-side authorization for list, item, and share mutations.
- OAuth scope checks for MCP tools.
- Better Auth configuration for email OTP, Google sign-in, rate limiting, and MCP OAuth endpoints.
- Drizzle schema for auth tables, OAuth provider tables, shopping lists, members, and items.
- MCP endpoint at `/mcp` with list, item, and sharing tools.
- Discovery endpoints:
  - `/.well-known/oauth-protected-resource`
  - `/.well-known/oauth-authorization-server`

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without `DATABASE_URL`, the app uses an in-memory development repository so the UI can be exercised immediately. With `DATABASE_URL`, route handlers use Postgres through Drizzle.

## Database

```bash
npm run db:generate
npm run db:migrate
```

Use Neon Postgres on Vercel Marketplace for the free-tier deployment path, then set `DATABASE_URL` in Vercel.

## Auth And Email

Set these environment variables in Vercel:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
AUTH_EMAIL_FROM="Shopping List <you@your-domain.com>"
```

Resend sends OTP emails when `RESEND_API_KEY` is present. Local development logs OTPs to the server console.

## MCP

The MCP resource is `NEXT_PUBLIC_APP_URL/mcp`. In development only, a bearer token of the form below can exercise the tool endpoint without completing OAuth:

```bash
Authorization: Bearer dev:user_admin:lists:read,lists:update
```

Production requests should use Better Auth's MCP OAuth flow and scopes:

- `lists:read`
- `lists:create`
- `lists:update`
- `lists:delete`
- `lists:share`

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
