import { z } from "zod";
import type { OAuthScope } from "@/lib/permissions";
import {
  addItem,
  createShoppingList,
  deleteItem,
  deleteShoppingList,
  getShoppingList,
  listShoppingLists,
  renameShoppingList,
  shareList,
  ShoppingAccessError,
  updateItem,
} from "@/lib/shopping/service";
import type { ShoppingRepository } from "@/lib/shopping/types";
import { canonicalMcpResource } from "./metadata";

export type McpSession = {
  userId: string;
  scopes: OAuthScope[];
  audience: string;
};

type McpRequestInput = {
  request: Request;
  repository: ShoppingRepository;
  session: McpSession | null;
  origin: string;
};

const rpcSchema = z.object({
  jsonrpc: z.literal("2.0").default("2.0"),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
});

const toolCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

const listIdSchema = z.object({ listId: z.string().min(1) });
const createListSchema = z.object({ name: z.string().min(1).max(120) });
const renameListSchema = z.object({ listId: z.string().min(1), name: z.string().min(1).max(120) });
const addItemSchema = z.object({
  listId: z.string().min(1),
  name: z.string().min(1).max(160),
  quantity: z.string().max(80).nullish(),
});
const updateItemSchema = z.object({
  listId: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().min(1).max(160).optional(),
  quantity: z.string().max(80).nullish(),
  checked: z.boolean().optional(),
});
const deleteItemSchema = z.object({ listId: z.string().min(1), itemId: z.string().min(1) });
const shareSchema = z.object({
  listId: z.string().min(1),
  email: z.email(),
  role: z.enum(["editor", "viewer"]),
});

const tools = [
  "list_shopping_lists",
  "get_shopping_list",
  "create_shopping_list",
  "rename_shopping_list",
  "delete_shopping_list",
  "add_item",
  "update_item",
  "delete_item",
  "share_list",
] as const;

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function authChallenge(origin: string) {
  return `Bearer resource_metadata="${origin.replace(/\/$/, "")}/.well-known/oauth-protected-resource"`;
}

function scopeChallenge(scope: OAuthScope) {
  return `Bearer error="insufficient_scope", scope="${scope}"`;
}

function toolResult(id: string | number | null | undefined, value: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify(value, null, 2),
        },
      ],
    },
  };
}

function toolList(id: string | number | null | undefined) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result: {
      tools: tools.map((name) => ({
        name,
        description: `Shopping list tool: ${name}`,
        inputSchema: {
          type: "object",
          additionalProperties: true,
        },
      })),
    },
  };
}

export async function handleMcpHttpRequest({
  request,
  repository,
  session,
  origin,
}: McpRequestInput): Promise<Response> {
  if (!session) {
    return json(
      {
        error: "unauthorized",
        error_description: "Bearer token required.",
      },
      {
        status: 401,
        headers: { "www-authenticate": authChallenge(origin) },
      },
    );
  }

  if (session.audience !== canonicalMcpResource(origin)) {
    return json(
      {
        error: "invalid_token",
        error_description: "Token audience does not match this MCP resource.",
      },
      { status: 401, headers: { "www-authenticate": authChallenge(origin) } },
    );
  }

  try {
    const rpc = rpcSchema.parse(await request.json());
    if (rpc.method === "tools/list") {
      return json(toolList(rpc.id));
    }

    if (rpc.method !== "tools/call") {
      return json({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32601, message: "Method not found" } }, { status: 404 });
    }

    const params = toolCallParamsSchema.parse(rpc.params);
    const actor = { userId: session.userId, scopes: session.scopes };
    let result: unknown;

    switch (params.name) {
      case "list_shopping_lists":
        result = await listShoppingLists(repository, actor);
        break;
      case "get_shopping_list":
        result = await getShoppingList(repository, actor, listIdSchema.parse(params.arguments).listId);
        break;
      case "create_shopping_list":
        result = await createShoppingList(repository, actor, createListSchema.parse(params.arguments).name);
        break;
      case "rename_shopping_list":
        result = await renameShoppingList(repository, actor, renameListSchema.parse(params.arguments).listId, renameListSchema.parse(params.arguments).name);
        break;
      case "delete_list":
      case "delete_shopping_list":
        await deleteShoppingList(repository, actor, listIdSchema.parse(params.arguments).listId);
        result = { deleted: true };
        break;
      case "add_item":
        result = await addItem(repository, actor, addItemSchema.parse(params.arguments));
        break;
      case "update_item":
        result = await updateItem(repository, actor, updateItemSchema.parse(params.arguments));
        break;
      case "delete_item":
        await deleteItem(repository, actor, deleteItemSchema.parse(params.arguments));
        result = { deleted: true };
        break;
      case "share_list":
        result = await shareList(repository, actor, shareSchema.parse(params.arguments));
        break;
      default:
        return json({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32602, message: "Unknown tool" } }, { status: 400 });
    }

    return json(toolResult(rpc.id, result));
  } catch (error) {
    if (error instanceof ShoppingAccessError) {
      const headers = error.requiredScope
        ? { "www-authenticate": scopeChallenge(error.requiredScope) }
        : undefined;
      return json(
        {
          error: error.reason,
          required_scope: error.requiredScope,
        },
        { status: error.status, headers },
      );
    }

    if (error instanceof z.ZodError) {
      return json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    }

    return json({ error: "server_error" }, { status: 500 });
  }
}
