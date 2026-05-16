import { describe, expect, it } from "vitest";
import { handleMcpHttpRequest } from "./mcp/http";
import { createMemoryShoppingRepository } from "./shopping/memory-repository";

function jsonRpc(toolName: string, args: unknown = {}) {
  return new Request("https://example.test/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "test-1",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });
}

describe("MCP HTTP endpoint", () => {
  it("returns an RFC9728 resource metadata challenge when missing auth", async () => {
    const repo = createMemoryShoppingRepository();

    const response = await handleMcpHttpRequest({
      request: jsonRpc("list_shopping_lists"),
      repository: repo,
      session: null,
      origin: "https://example.test",
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://example.test/.well-known/oauth-protected-resource"',
    );
  });

  it("rejects valid members when the token audience is for another resource", async () => {
    const repo = createMemoryShoppingRepository();

    const response = await handleMcpHttpRequest({
      request: jsonRpc("list_shopping_lists"),
      repository: repo,
      session: {
        userId: "user_admin",
        scopes: ["lists:read"],
        audience: "https://other.example/mcp",
      },
      origin: "https://example.test",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: "invalid_token",
      error_description: "Token audience does not match this MCP resource.",
    });
  });

  it("returns an insufficient scope challenge before calling a tool", async () => {
    const repo = createMemoryShoppingRepository();
    const list = await repo.createList({ name: "Weekend", ownerId: "user_admin" });

    const response = await handleMcpHttpRequest({
      request: jsonRpc("delete_list", { listId: list.id }),
      repository: repo,
      session: {
        userId: "user_admin",
        scopes: ["lists:read"],
        audience: "https://example.test/mcp",
      },
      origin: "https://example.test",
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toContain('scope="lists:delete"');
  });

  it("allows an editor with lists:update to add an item but not share the list", async () => {
    const repo = createMemoryShoppingRepository();
    await repo.createUser({ id: "user_editor", email: "editor@example.test", name: "Editor" });
    const list = await repo.createList({ name: "Groceries", ownerId: "user_admin" });
    await repo.setMemberRole({
      listId: list.id,
      actorId: "user_admin",
      targetUserEmail: "editor@example.test",
      role: "editor",
    });

    const addResponse = await handleMcpHttpRequest({
      request: jsonRpc("add_item", { listId: list.id, name: "Oats" }),
      repository: repo,
      session: {
        userId: "user_editor",
        scopes: ["lists:update"],
        audience: "https://example.test/mcp",
      },
      origin: "https://example.test",
    });

    expect(addResponse.status).toBe(200);
    await expect(addResponse.json()).resolves.toMatchObject({
      result: {
        content: [{ type: "text" }],
      },
    });

    const shareResponse = await handleMcpHttpRequest({
      request: jsonRpc("share_list", {
        listId: list.id,
        email: "viewer@example.test",
        role: "viewer",
      }),
      repository: repo,
      session: {
        userId: "user_editor",
        scopes: ["lists:share"],
        audience: "https://example.test/mcp",
      },
      origin: "https://example.test",
    });

    expect(shareResponse.status).toBe(403);
    await expect(shareResponse.json()).resolves.toMatchObject({
      error: "forbidden_role",
    });
  });
});
