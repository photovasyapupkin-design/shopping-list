import { protectedResourceMetadata } from "@/lib/mcp/metadata";

export function GET(request: Request) {
  return Response.json(protectedResourceMetadata(new URL(request.url).origin));
}
