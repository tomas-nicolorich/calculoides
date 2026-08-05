import { prisma } from "../../../api/_src/utils/prisma";

export const UserService = {
  /**
   * Upserts a user row keyed on Supabase user id.
   * On conflict (same id), updates name and email.
   */
  async upsertUser(id: string, email: string, name: string) {
    return await prisma.user.upsert({
      where: { id },
      create: {
        id,
        email,
        name,
      },
      update: {
        email,
        name,
      },
    });
  },

  /**
   * Returns the user row for the given id, or null if not found.
   */
  async getUser(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    });
  },
};
