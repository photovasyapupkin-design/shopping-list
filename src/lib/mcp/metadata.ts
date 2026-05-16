import type { OAuthScope } from "@/lib/permissions";
import { oauthScopes } from "@/lib/permissions";

export function canonicalMcpResource(origin: string) {
  return `${origin.replace(/\/$/, "")}/mcp`;
}

export function protectedResourceMetadata(origin: string) {
  const base = origin.replace(/\/$/, "");
  return {
    resource: canonicalMcpResource(base),
    authorization_servers: [base],
    jwks_uri: `${base}/api/auth/jwks`,
    scopes_supported: oauthScopes,
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256", "ES256"],
  };
}

export function authorizationServerMetadata(origin: string) {
  const base = origin.replace(/\/$/, "");
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/auth/mcp/authorize`,
    token_endpoint: `${base}/api/auth/mcp/token`,
    registration_endpoint: `${base}/api/auth/mcp/register`,
    jwks_uri: `${base}/api/auth/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
    scopes_supported: oauthScopes satisfies readonly OAuthScope[],
  };
}
