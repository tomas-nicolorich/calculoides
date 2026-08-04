import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { CreateGroupForm } from "./CreateGroupForm";
import { groupApi } from "../../entities/group";
import { QueryWrapper, createTestQueryClient } from "../../test/queryTestUtils";
import { queryKeys } from "../../shared/api/queryKeys";

vi.mock("../../entities/group", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../entities/group")>();
  return {
    ...actual,
    groupApi: {
      ...actual.groupApi,
      create: vi.fn().mockResolvedValue({ id: "g1", name: "New Group" }),
    },
  };
});

function render(
  ui: ReactElement,
  client: QueryClient = createTestQueryClient(),
) {
  return rtlRender(<QueryWrapper client={client}>{ui}</QueryWrapper>);
}

describe("CreateGroupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a group, invalidates the groups query, and calls onCreated", async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const onCreated = vi.fn();
    render(<CreateGroupForm onCreated={onCreated} />, client);

    await user.type(screen.getByLabelText(/group name/i), "New Group");
    await user.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(groupApi.create).toHaveBeenCalledWith("New Group");
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.groups(),
      });
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it("shows an inline error and does not call onCreated when groupApi.create rejects", async () => {
    vi.mocked(groupApi.create).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateGroupForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/group name/i), "New Group");
    await user.click(screen.getByRole("button", { name: /create group/i }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
