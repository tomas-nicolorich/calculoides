/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from "vitest";
import { ArchiveService } from "../../src/services/archive";
import { GroupService } from "../../src/services/group";

vi.mock("../../src/services/group", () => ({
  GroupService: { isOwner: vi.fn() },
}));

vi.mock("../../src/utils/prisma", () => ({
  prisma: {
    settlement: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    groupMember: { findMany: vi.fn().mockResolvedValue([]) },
    category: { findMany: vi.fn().mockResolvedValue([]) },
    expense: { updateMany: vi.fn() },
    transfer: { updateMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        settlement: { createMany: vi.fn(), deleteMany: vi.fn() },
        expense: { updateMany: vi.fn() },
        transfer: { updateMany: vi.fn() },
      }),
    ),
  },
}));

describe("ArchiveService", () => {
  it("archives a month when caller is owner", async () => {
    vi.mocked(GroupService.isOwner).mockResolvedValue(true);
    const result = await ArchiveService.archiveMonth(
      "group-1",
      "owner-1",
      "2024-05",
    );
    expect(result.periodMonth).toBe("2024-05");
  });

  it("rejects archiving when caller is not owner", async () => {
    vi.mocked(GroupService.isOwner).mockResolvedValue(false);
    await expect(
      ArchiveService.archiveMonth("group-1", "member-1", "2024-05"),
    ).rejects.toThrow("Only the group owner can archive expenses");
  });

  it("rejects undoing when undo window has expired", async () => {
    vi.mocked(GroupService.isOwner).mockResolvedValue(true);
    const { prisma } = await import("../../src/utils/prisma");
    vi.mocked(prisma.settlement.findMany).mockResolvedValue([
      // archivedAt 60 seconds ago — outside the 10s window
      { archivedAt: new Date(Date.now() - 60_000) } as never,
    ]);
    await expect(
      ArchiveService.undoArchive("group-1", "owner-1", "2024-05"),
    ).rejects.toThrow("Undo window has expired");
  });
});
