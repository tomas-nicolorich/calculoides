import { createElement, type ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useIncomeSession } from "./useIncomeSession";
import type { IncomeSessionMember } from "./useIncomeSession";
import { QueryWrapper, createTestQueryClient } from "../../test/queryTestUtils";
import { queryKeys } from "../../shared/api/queryKeys";

const mockUpdateMemberIncome =
  vi.fn<(memberId: string, income: number) => Promise<unknown>>();

vi.mock("../group/index", async (importOriginal) => {
  const module = await importOriginal<typeof import("../group/index")>();
  return {
    ...module,
    groupApi: {
      ...module.groupApi,
      updateMemberIncome: (memberId: string, income: number) =>
        mockUpdateMemberIncome(memberId, income),
    },
  };
});

vi.mock("../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

const mockMembers: IncomeSessionMember[] = [
  { id: "m1", income: 3000 },
  { id: "m2", income: 1000 },
];

function makeHook(client = createTestQueryClient()) {
  return renderHook(
    ({ members }: { members: IncomeSessionMember[] | null }) =>
      useIncomeSession(members, "group-1"),
    {
      initialProps: { members: null as IncomeSessionMember[] | null },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryWrapper, { client, children }),
    },
  );
}

describe("useIncomeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMemberIncome.mockResolvedValue({ id: "m1", income: 3000 });
  });

  it("sessionStart snapshots current incomes into overrideAmounts and phase editing", () => {
    const { result, rerender } = makeHook();

    expect(result.current.phase).toBe("idle");

    rerender({ members: mockMembers });

    expect(result.current.phase).toBe("editing");
    expect(result.current.overrideAmounts).toEqual({ m1: 3000, m2: 1000 });
  });

  it("overrideIncome updates the map and derived share % recomputes live", () => {
    const { result, rerender } = makeHook();
    rerender({ members: mockMembers });

    expect(result.current.shares).toEqual({ m1: 75, m2: 25 });

    act(() => {
      result.current.overrideIncome("m2", 3000);
    });

    expect(result.current.overrideAmounts).toEqual({ m1: 3000, m2: 3000 });
    expect(result.current.shares).toEqual({ m1: 50, m2: 50 });
  });

  it("NaN overrideIncome is a no-op", () => {
    const { result, rerender } = makeHook();
    rerender({ members: mockMembers });

    act(() => {
      result.current.overrideIncome("m1", NaN);
    });

    expect(result.current.overrideAmounts).toEqual({ m1: 3000, m2: 1000 });
  });

  it("negative overrideIncome is a no-op", () => {
    const { result, rerender } = makeHook();
    rerender({ members: mockMembers });

    act(() => {
      result.current.overrideIncome("m1", -50);
    });

    expect(result.current.overrideAmounts).toEqual({ m1: 3000, m2: 1000 });
  });

  it("saveSession calls updateMemberIncome only for changed members, invalidates the group query, and resolves to idle", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result, rerender } = makeHook(client);
    rerender({ members: mockMembers });

    act(() => {
      result.current.overrideIncome("m2", 1500);
    });

    await act(async () => {
      await result.current.saveSession();
    });

    expect(mockUpdateMemberIncome).toHaveBeenCalledTimes(1);
    expect(mockUpdateMemberIncome).toHaveBeenCalledWith("m2", 1500);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.group("group-1"),
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.saveError).toBeNull();
  });

  it("saveSession failure sets saveError, reverts to editing, preserves inputs", async () => {
    mockUpdateMemberIncome.mockRejectedValue(new Error("Network error"));

    const { result, rerender } = makeHook();
    rerender({ members: mockMembers });

    act(() => {
      result.current.overrideIncome("m2", 1500);
    });

    await act(async () => {
      await result.current.saveSession();
    });

    expect(result.current.phase).toBe("editing");
    expect(result.current.saveError).toBe("Network error");
    expect(result.current.overrideAmounts).toEqual({ m1: 3000, m2: 1500 });
  });

  it("cancelSession restores the start snapshot with no API call", () => {
    const { result, rerender } = makeHook();
    rerender({ members: mockMembers });

    act(() => {
      result.current.overrideIncome("m2", 1500);
    });

    act(() => {
      result.current.cancelSession();
    });

    expect(result.current.overrideAmounts).toEqual({ m1: 3000, m2: 1000 });
    expect(mockUpdateMemberIncome).not.toHaveBeenCalled();
  });
});
