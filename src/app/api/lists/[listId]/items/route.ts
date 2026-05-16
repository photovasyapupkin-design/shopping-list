import { z } from "zod";
import { apiJson, errorJson, getActorFromRequest } from "@/lib/http";
import { getShoppingRepository } from "@/lib/shopping/repository";
import { addItem } from "@/lib/shopping/service";

const addSchema = z.object({
  name: z.string().min(1).max(160),
  quantity: z.string().max(80).nullish(),
});

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId } = await params;
    const input = addSchema.parse(await request.json());
    const item = await addItem(getShoppingRepository(), actor, { listId, ...input });
    return apiJson({ item }, { status: 201 });
  } catch (error) {
    return errorJson(error);
  }
}
