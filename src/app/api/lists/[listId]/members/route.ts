import { z } from "zod";
import { apiJson, errorJson, getActorFromRequest } from "@/lib/http";
import { getShoppingRepository } from "@/lib/shopping/repository";
import { shareList } from "@/lib/shopping/service";

const shareSchema = z.object({
  email: z.email(),
  role: z.enum(["editor", "viewer"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const actor = await getActorFromRequest(request);
    const { listId } = await params;
    const input = shareSchema.parse(await request.json());
    const member = await shareList(getShoppingRepository(), actor, { listId, ...input });
    return apiJson({ member }, { status: 201 });
  } catch (error) {
    return errorJson(error);
  }
}
