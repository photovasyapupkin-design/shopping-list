import { authorizationServerMetadata } from "@/lib/mcp/metadata";

export function GET(request: Request) {
  return Response.json(authorizationServerMetadata(new URL(request.url).origin));
}
