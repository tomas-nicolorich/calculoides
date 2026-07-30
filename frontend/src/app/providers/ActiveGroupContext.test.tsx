import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ActiveGroupProvider,
  useActiveGroup,
  useActiveGroupSetter,
  ACTIVE_GROUP_STORAGE_KEY,
} from "./ActiveGroupContext";

/**
 * Slice 2 (task 2.4). Covers D4's two ActiveGroupContext-owned halves:
 * the synchronous optimistic restore from localStorage (A2), and clearing
 * on sign-out (A4). Validation against the fetched group list is
 * ActiveGroupSync's job (task 2.1/2.9), not tested here.
 */

let mockUser: { id: string } | null = { id: "u1" };
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

function Harness() {
  const groupId = useActiveGroup();
  const setGroupId = useActiveGroupSetter();
  return (
    <div>
      <span data-testid="group-id">{groupId ?? "none"}</span>
      <button
        onClick={() => {
          setGroupId("group-9");
        }}
      >
        set
      </button>
    </div>
  );
}

describe("ActiveGroupContext persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUser = { id: "u1" };
  });

  it("restores a persisted group id from localStorage synchronously on mount (no flicker)", () => {
    localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, "stored-group");

    render(
      <ActiveGroupProvider>
        <Harness />
      </ActiveGroupProvider>,
    );

    expect(screen.getByTestId("group-id")).toHaveTextContent("stored-group");
  });

  it("defaults to no active group when nothing is stored", () => {
    render(
      <ActiveGroupProvider>
        <Harness />
      </ActiveGroupProvider>,
    );

    expect(screen.getByTestId("group-id")).toHaveTextContent("none");
  });

  it("clears the persisted active group and its storage key when the user signs out", () => {
    const { rerender } = render(
      <ActiveGroupProvider>
        <Harness />
      </ActiveGroupProvider>,
    );

    act(() => {
      screen.getByText("set").click();
    });
    expect(screen.getByTestId("group-id")).toHaveTextContent("group-9");
    expect(localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY)).toBe("group-9");

    mockUser = null;
    rerender(
      <ActiveGroupProvider>
        <Harness />
      </ActiveGroupProvider>,
    );

    expect(screen.getByTestId("group-id")).toHaveTextContent("none");
    expect(localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY)).toBeNull();
  });
});
