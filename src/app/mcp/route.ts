import { withMcpAuth } from "better-auth/plugins";
import { getAuth } from "@/lib/auth";
import { handleMcpHttpRequest, type McpSession } from "@/lib/mcp/http";
import { canonicalMcpResource } from "@/lib/mcp/metadata";
import { getShoppingRepository } from "@/lib/shopping/repository";
import type { OAuthScope } from "@/lib/permissions";
import { oauthScopes } from "@/lib/permissions";

function parseDevSession(request: Request, origin: string): McpSession | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer dev:")) {
    return null;
  }

  const [, userId = "user_admin", scopeText = "lists:read"] = header.slice("Bearer dev:".length).split(":");
  const scopes = scopeText
    .split(",")
    .filter((scope): scope is OAuthScope => oauthScopes.includes(scope as OAuthScope));

  return {
    userId,
    scopes,
    audience: canonicalMcpResource(origin),
  };
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const repository = getShoppingRepository();
  const devSession = parseDevSession(request, origin);

  if (devSession || !request.headers.has("authorization")) {
    return handleMcpHttpRequest({
      request,
      repository,
      session: devSession,
      origin,
    });
  }

  return withMcpAuth(getAuth(), async (authenticatedRequest, session) => {
    return handleMcpHttpRequest({
      request: authenticatedRequest,
      repository,
      session: {
        userId: session.userId,
        scopes: session.scopes
          .split(" ")
          .filter((scope): scope is OAuthScope => oauthScopes.includes(scope as OAuthScope)),
        audience: canonicalMcpResource(origin),
      },
      origin,
    });
  })(request);
}
