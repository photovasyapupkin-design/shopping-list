import { z } from "zod";
import { apiJson, errorJson, getActorFromRequest } from "@/lib/http";
import { getShoppingRepository } from "@/lib/shopping/repository";
import { deleteItem, updateItem } from "@/lib/shopping/service";

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  quantity: z.string().max(80).nullish(),
  checked: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string; itemId: string }> },
) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId, itemId } = await params;
    const input = updateSchema.parse(await request.json());
    const item = await updateItem(getShoppingRepository(), actor, { listId, itemId, ...input });
    return apiJson({ item });
  } catch (error) {
    return errorJson(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string; itemId: string }> },
) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId, itemId } = await params;
    await deleteItem(getShoppingRepository(), actor, { listId, itemId });
    return apiJson({ deleted: true });
  } catch (error) {
    return errorJson(error);
  }
}
