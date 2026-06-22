import { render, screen, waitFor } from "@testing-library/react";
import { GroupsPage } from "@/pages/groups/ui/GroupsPage";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { groupApi, type Group } from "@/entities/group";

vi.mock("@/entities/group", () => ({
  groupApi: {
    list: vi.fn(),
  },
}));

describe("Groups Page", () => {
  it("should not crash when a group has an undefined role", async () => {
    const mockGroups = [
      { id: "1", name: "Broken Group", role: "MEMBER", members: [] },
    ] as unknown as Group[];
    vi.mocked(groupApi.list).mockResolvedValueOnce(mockGroups);

    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    // If it crashes, the test will fail before reaching this point
    await waitFor(() => {
      expect(screen.getByText("Broken Group")).toBeInTheDocument();
    });
  });
});
