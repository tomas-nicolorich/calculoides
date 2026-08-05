/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "../../../lib/server/services/user";
import { prisma } from "../../_src/utils/prisma";
import { User } from "@prisma/client";

vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const mockUser: User = {
  id: "user-uuid-1",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upsertUser", () => {
    it("should create a new user row when none exists", async () => {
      vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser);

      const result = await UserService.upsertUser(
        mockUser.id,
        mockUser.email,
        "Test User",
      );

      expect(vi.mocked(prisma.user.upsert)).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        create: {
          id: mockUser.id,
          email: mockUser.email,
          name: "Test User",
        },
        update: {
          email: mockUser.email,
          name: "Test User",
        },
      });
      expect(result).toEqual(mockUser);
    });

    it("should update an existing row (idempotent — same call returns updated user)", async () => {
      const updatedUser: User = { ...mockUser, name: "Updated Name" };
      vi.mocked(prisma.user.upsert).mockResolvedValue(updatedUser);

      const result = await UserService.upsertUser(
        mockUser.id,
        mockUser.email,
        "Updated Name",
      );

      expect(vi.mocked(prisma.user.upsert)).toHaveBeenCalledTimes(1);
      expect(result.name).toBe("Updated Name");
    });
  });

  describe("getUser", () => {
    it("should return the user when found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await UserService.getUser(mockUser.id);

      expect(vi.mocked(prisma.user.findUnique)).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null when the user is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await UserService.getUser("nonexistent-id");

      expect(result).toBeNull();
    });
  });
});
