import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActiveGroupSync } from "./ActiveGroupSync";

/**
 * Slice 2 (task 2.1). `ActiveGroupSync` renders `null` and only validates
 * the (already optimistically restored, see ActiveGroupContext) active
 * group id against the fetched group list once it settles (design A3).
 */

const setGroupId = vi.fn();
let mockGroupId: string | null = null;
let mockGroups: { id: string }[] = [];
let mockLoading = false;

vi.mock("./ActiveGroupContext", () => ({
  useActiveGroup: () => mockGroupId,
  useActiveGroupSetter: () => setGroupId,
}));

vi.mock("./GroupListContext", () => ({
  useGroupList: () => ({
    groups: mockGroups,
    loading: mockLoading,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe("ActiveGroupSync", () => {
  beforeEach(() => {
    setGroupId.mockClear();
    mockGroupId = null;
    mockGroups = [];
    mockLoading = false;
  });

  it("clears a stored group id once the list settles and it's no longer present", () => {
    mockGroupId = "stale-group";
    mockGroups = [{ id: "group-1" }, { id: "group-2" }];

    render(<ActiveGroupSync />);

    expect(setGroupId).toHaveBeenCalledWith(null);
  });

  it("does not auto-pick a group when none is active, even with groups available", () => {
    mockGroupId = null;
    mockGroups = [{ id: "group-1" }];

    render(<ActiveGroupSync />);

    expect(setGroupId).not.toHaveBeenCalled();
  });

  it("leaves a valid active group id untouched", () => {
    mockGroupId = "group-1";
    mockGroups = [{ id: "group-1" }];

    render(<ActiveGroupSync />);

    expect(setGroupId).not.toHaveBeenCalled();
  });

  it("does not clear while the list is still loading", () => {
    mockGroupId = "group-1";
    mockGroups = [];
    mockLoading = true;

    render(<ActiveGroupSync />);

    expect(setGroupId).not.toHaveBeenCalled();
  });
});
