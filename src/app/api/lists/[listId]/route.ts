import { z } from "zod";
import { apiJson, errorJson, getActorFromRequest } from "@/lib/http";
import { getShoppingRepository } from "@/lib/shopping/repository";
import { deleteShoppingList, getShoppingList, renameShoppingList } from "@/lib/shopping/service";

const renameSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function GET(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId } = await params;
    const list = await getShoppingList(getShoppingRepository(), actor, listId);
    return apiJson({ list });
  } catch (error) {
    return errorJson(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId } = await params;
    const input = renameSchema.parse(await request.json());
    const list = await renameShoppingList(getShoppingRepository(), actor, listId, input.name);
    return apiJson({ list });
  } catch (error) {
    return errorJson(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId } = await params;
    await deleteShoppingList(getShoppingRepository(), actor, listId);
    return apiJson({ deleted: true });
  } catch (error) {
    return errorJson(error);
  }
}
