"use server";

import { z } from "zod";
import { createClient } from "../supabase/server";
import { isGroupMember, isGroupOwner } from "../server/authz";
import { GroupService } from "../server/services/group";
import { ArchiveService } from "../server/services/archive";
import { InvitationService } from "../server/services/invitation";
import { toStatus } from "../server/errors";
import { ActionResult, ok, fail } from "./result";
import {
  CreateGroupSchema,
  ArchiveBodySchema,
  CreateInvitationSchema,
  IdSchema,
} from "shared";

// Server Actions ported from `api/_src/handlers/groups.ts` (3a.2, 3a.4,
// 3a.6). Every action returns `ActionResult<T>`, never throws (3a.7).

const TransferOwnershipSchema = z.object({
  groupId: IdSchema,
  newOwnerId: IdSchema,
});

const InvitationCreateSchema = CreateInvitationSchema.extend({
  groupId: IdSchema,
});

const RespondInviteSchema = z.object({
  token: z.string(),
  action: z.enum(["ACCEPT", "REJECT"]),
});

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

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

function fromThrown<T>(err: unknown): ActionResult<T> {
  const message = err instanceof Error ? err.message : String(err);
  return fail(message, toStatus(message));
}

// resource-authorization: "Group Access Requires Membership or Ownership"
// (3a.1) — `isGroupMember` already treats an owner as a member via
// `GroupService.getGroupsForUser`'s combined `OR` clause.
export async function read(
  groupId: string,
): Promise<
  ActionResult<Awaited<ReturnType<typeof GroupService.getGroupById>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const isMember = await isGroupMember(userId, groupId);
  if (!isMember) return fail("Access denied to this group", 403);

  try {
    const group = await GroupService.getGroupById(groupId, userId);
    return ok(group);
  } catch (err) {
    return fromThrown(err);
  }
}

/** Ports `groups.ts`'s `create` route — any authenticated user may create a group. */
export async function create(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof GroupService.createGroup>>>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = CreateGroupSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid group name", 400);

  try {
    const group = await GroupService.createGroup(userId, parsed.data.name);
    return ok(group);
  } catch (err) {
    return fromThrown(err);
  }
}

// Ports `groups.ts`'s `archive` route. Ownership is enforced inside
// `ArchiveService.archiveMonth` itself; this surfaces that as a 403
// `ActionResult` via `toStatus` rather than duplicating the check.
export async function archive(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof ArchiveService.archiveMonth>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = ArchiveBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid archive request", 400);

  try {
    const result = await ArchiveService.archiveMonth(
      parsed.data.groupId,
      userId,
      parsed.data.periodMonth,
    );
    return ok(result);
  } catch (err) {
    return fromThrown(err);
  }
}

/** Ports `groups.ts`'s `undo-archive` route; same ownership precedent as {@link archive}. */
export async function undoArchive(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = ArchiveBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid archive request", 400);

  try {
    await ArchiveService.undoArchive(
      parsed.data.groupId,
      userId,
      parsed.data.periodMonth,
    );
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}

// Ports `groups.ts`'s `transfer` route, porting the owner-only check from
// `groups.ts:80` via {@link isGroupOwner} (3a.4). Threat Matrix case 4: a
// non-owner is denied 403 before `GroupService.transferOwnership` — which
// itself performs no caller-identity check — is ever invoked (3a.3).
export async function transferOwnership(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof GroupService.transferOwnership>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = TransferOwnershipSchema.safeParse(input);
  if (!parsed.success) return fail("Missing groupId or newOwnerId", 400);

  const isOwner = await isGroupOwner(userId, parsed.data.groupId);
  if (!isOwner) return fail("Only the owner can transfer ownership", 403);

  try {
    const group = await GroupService.transferOwnership(
      parsed.data.groupId,
      parsed.data.newOwnerId,
    );
    return ok(group);
  } catch (err) {
    return fromThrown(err);
  }
}

// Ports `groups.ts`'s `invitations` POST route — only an existing member
// of the target group may invite someone into it (3a.5).
export async function invitationCreate(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof InvitationService.createInvitation>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = InvitationCreateSchema.safeParse(input);
  if (!parsed.success) return fail("Missing groupId or invalid email", 400);

  const isMember = await isGroupMember(userId, parsed.data.groupId);
  if (!isMember) return fail("Access denied to this group", 403);

  try {
    const invitation = await InvitationService.createInvitation(
      parsed.data.groupId,
      userId,
      parsed.data.email,
    );
    return ok(invitation);
  } catch (err) {
    return fromThrown(err);
  }
}

// Ports `groups.ts`'s `respond-invite` route. `rejectInvitation` performs
// no caller check at all, so this adds the invited-user-only gate itself
// before calling either accept/reject branch (3a.5-3a.6).
export async function respondInvite(
  input: unknown,
): Promise<ActionResult<unknown>> {
  const user = await getAuthenticatedUser();
  if (!user) return fail("Unauthorized", 403);

  const parsed = RespondInviteSchema.safeParse(input);
  if (!parsed.success) return fail("Missing token or action", 400);

  const invitation = await InvitationService.getInvitationByToken(
    parsed.data.token,
  );
  if (!invitation) return fail("Invalid or expired invitation", 404);

  if (invitation.email !== user.email) {
    return fail("This invitation is not addressed to you", 403);
  }

  try {
    if (parsed.data.action === "ACCEPT") {
      const result = await InvitationService.acceptInvitation(
        parsed.data.token,
        user.id,
      );
      return ok(result);
    }
    const result = await InvitationService.rejectInvitation(parsed.data.token);
    return ok(result);
  } catch (err) {
    return fromThrown(err);
  }
}
