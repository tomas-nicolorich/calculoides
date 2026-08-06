import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking conventions as `lib/actions/expense.test.ts` / `member.test.ts`.
const {
  getUserMock,
  isGroupMemberMock,
  isGroupOwnerMock,
  createCategoryMock,
  updateCategoryMock,
  getCategoryByIdMock,
  deleteCategoryMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupMemberMock: vi.fn(),
  isGroupOwnerMock: vi.fn(),
  createCategoryMock: vi.fn(),
  updateCategoryMock: vi.fn(),
  getCategoryByIdMock: vi.fn(),
  deleteCategoryMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../server/authz", () => ({
  isGroupMember: isGroupMemberMock,
  isGroupOwner: isGroupOwnerMock,
}));

vi.mock("../server/services/budget", () => ({
  BudgetService: {
    createCategory: createCategoryMock,
    updateCategory: updateCategoryMock,
    getCategoryById: getCategoryByIdMock,
    deleteCategory: deleteCategoryMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { create, update, deleteCategory } from "./category";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";

describe("create", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    createCategoryMock.mockReset();
    revalidatePathMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership". `BudgetService.createCategory` has no internal check of
  // its own (unlike `ExpenseService.logExpense`), so the action must gate
  // on membership itself before the write — same `deleteAllExpenses` gap
  // 4a.4 closed at the action layer.
  it("creates a category for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    createCategoryMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
      name: "Groceries",
    });

    const result = await create({
      groupId: GROUP_ID,
      name: "Groceries",
      monthlyBudget: 400,
    });

    expect(result).toEqual({
      ok: true,
      data: { id: CATEGORY_ID, groupId: GROUP_ID, name: "Groceries" },
    });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-member with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const result = await create({
      groupId: GROUP_ID,
      name: "Groceries",
      monthlyBudget: 400,
    });

    expect(result).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
    expect(createCategoryMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("update", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    updateCategoryMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("updates the category for a member of its own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateCategoryMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
      name: "Rent",
      monthlyBudget: 900,
    });

    const result = await update({
      categoryId: CATEGORY_ID,
      name: "Rent",
      monthlyBudget: 900,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: CATEGORY_ID,
        groupId: GROUP_ID,
        name: "Rent",
        monthlyBudget: 900,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("rejects an outsider via the service's own membership check", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateCategoryMock.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const result = await update({
      categoryId: CATEGORY_ID,
      name: "Rent",
      monthlyBudget: 900,
    });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

// resource-authorization: "Category Deletion Requires Ownership" (4b.1).
describe("deleteCategory", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupOwnerMock.mockReset();
    getCategoryByIdMock.mockReset();
    deleteCategoryMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("succeeds when the owner deletes a category belonging to their group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getCategoryByIdMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
    });
    isGroupOwnerMock.mockResolvedValue(true);
    deleteCategoryMock.mockResolvedValue(undefined);

    const result = await deleteCategory({ categoryId: CATEGORY_ID });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(isGroupOwnerMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(deleteCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-owner member with 403 and never deletes the category", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getCategoryByIdMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
    });
    isGroupOwnerMock.mockResolvedValue(false);

    const result = await deleteCategory({ categoryId: CATEGORY_ID });

    expect(result).toEqual({
      ok: false,
      error: "Only group owners can delete categories",
      status: 403,
    });
    expect(deleteCategoryMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getCategoryByIdMock.mockResolvedValue(null);

    const result = await deleteCategory({ categoryId: CATEGORY_ID });

    expect(result).toEqual({
      ok: false,
      error: "Category not found",
      status: 404,
    });
    expect(isGroupOwnerMock).not.toHaveBeenCalled();
    expect(deleteCategoryMock).not.toHaveBeenCalled();
  });
});
