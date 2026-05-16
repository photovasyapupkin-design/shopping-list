import { getAuth } from "@/lib/auth";
import { getShoppingRepository } from "@/lib/shopping/repository";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getActorFromRequest(request: Request) {
  if (process.env.DATABASE_URL) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      throw new HttpError(401, "Sign in required");
    }

    return { userId: session.user.id };
  }

  const userId = request.headers.get("x-demo-user") ?? "user_admin";
  const repository = getShoppingRepository();
  const existing = await repository.findUserById(userId);
  if (!existing) {
    await repository.createUser({
      id: userId,
      email: `${userId}@example.test`,
      name: userId.replace("user_", "").replaceAll("_", " "),
    });
  }

  return { userId };
}

export function apiJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function errorJson(error: unknown) {
  if (error instanceof HttpError) {
    return apiJson({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    const status = error.message.includes("registered") ? 404 : 400;
    return apiJson({ error: error.message }, { status });
  }

  return apiJson({ error: "Unexpected error" }, { status: 500 });
}
