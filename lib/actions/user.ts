"use server";

import { z } from "zod";
import { createClient } from "../supabase/server";
import { UserService } from "../server/services/user";
import { toStatus } from "../server/errors";
import { ActionResult, ok, fail } from "./result";

// Server Action ported from `api/_src/handlers/users.ts`'s `upsert` route
// (3b.7). resource-authorization: "User Profile Access Is Self-Scoped" — the
// id is always resolved from the session, never from `input`, so an `id`
// field in the payload has no schema key to bind to and is silently dropped
// by `UpsertUserSchema.safeParse`.

const UpsertUserSchema = z.object({
  name: z.string().min(1),
});

async function getAuthenticatedUser(): Promise<{
  id: string;
  email?: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export async function upsert(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof UserService.upsertUser>>>> {
  const user = await getAuthenticatedUser();
  if (!user) return fail("Unauthorized", 403);
  if (!user.email) return fail("User email not found in session", 400);

  const parsed = UpsertUserSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid name", 400);

  try {
    const result = await UserService.upsertUser(
      user.id,
      user.email,
      parsed.data.name,
    );
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message, toStatus(message));
  }
}
