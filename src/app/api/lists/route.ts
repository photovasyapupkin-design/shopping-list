import { z } from "zod";
import { apiJson, errorJson, getActorFromRequest } from "@/lib/http";
import { getShoppingRepository } from "@/lib/shopping/repository";
import { createShoppingList, listShoppingLists } from "@/lib/shopping/service";

const createSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function GET(request: Request) {
  try {
    const actor = await getActorFromRequest(request);
    const lists = await listShoppingLists(getShoppingRepository(), actor);
    return apiJson({ lists });
  } catch (error) {
    return errorJson(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActorFromRequest(request);
    const input = createSchema.parse(await request.json());
    const list = await createShoppingList(getShoppingRepository(), actor, input.name);
    return apiJson({ list }, { status: 201 });
  } catch (error) {
    return errorJson(error);
  }
}
