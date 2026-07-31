import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupsPage } from "@/pages/groups/ui/GroupsPage";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { groupApi, type Group } from "@/entities/group";
import { useGroupList } from "@/app/providers/GroupListContext";

/**
 * Slice 2 (task 2.5): `GroupsPage` no longer owns its own fetch — it reads
 * from `useGroupList()` (task 2.13), so `groupApi.list` must never be
 * called directly by this page anymore.
 */

vi.mock("@/entities/group", () => ({
  groupApi: {
    list: vi.fn(),
  },
}));

vi.mock("@/app/providers/GroupListContext", () => ({
  useGroupList: vi.fn(),
}));

describe("Groups Page", () => {
  it("should not crash when a group has an undefined role", () => {
    const mockGroups = [
      { id: "1", name: "Broken Group", role: "MEMBER", members: [] },
    ] as unknown as Group[];
    vi.mocked(useGroupList).mockReturnValue({
      groups: mockGroups,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Broken Group")).toBeInTheDocument();
  });

  it("reads groups from useGroupList instead of fetching on mount", () => {
    const mockGroups = [
      {
        id: "g1",
        name: "Household",
        role: "OWNER",
        members: [{ id: "m1", income: 1000 }],
      },
    ] as unknown as Group[];
    vi.mocked(useGroupList).mockReturnValue({
      groups: mockGroups,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Household")).toBeInTheDocument();
    expect(groupApi.list).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton while the group list is loading", () => {
    vi.mocked(useGroupList).mockReturnValue({
      groups: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Broken Group")).not.toBeInTheDocument();
  });

  it("retries via the group list's refresh, not a local fetch", async () => {
    const refresh = vi.fn();
    vi.mocked(useGroupList).mockReturnValue({
      groups: [],
      loading: false,
      error: "Couldn't load your groups. Please try refreshing.",
      refresh,
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
