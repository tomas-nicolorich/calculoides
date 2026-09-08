// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CreateGroupForm } from "./CreateGroupForm";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("../../../../lib/actions/group", () => ({
  create: createMock,
}));

/**
 * groups-view spec (PR 11, task 11.3): group creation moves off
 * `GroupsClient`'s inline `<input>`/`<button>` into this dedicated
 * component, wired to the existing `lib/actions/group.ts` `create` action.
 */
describe("CreateGroupForm", () => {
  afterEach(() => {
    cleanup();
    createMock.mockReset();
  });

  // Scenario: "Successful creation adds the group to the list"
  it("calls onCreated with the new group once create resolves successfully", async () => {
    createMock.mockResolvedValue({
      ok: true,
      data: { id: "new-1", name: "Weekend House" },
    });
    const onCreated = vi.fn();

    render(<CreateGroupForm onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText("Group Name"), {
      target: { value: "Weekend House" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({
        id: "new-1",
        name: "Weekend House",
      });
    });
    expect(createMock).toHaveBeenCalledWith({ name: "Weekend House" });
  });

  // Scenario: "Server-side validation error surfaces inline"
  it("renders the server error inline and never calls onCreated", async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: "Name is required",
      status: 400,
    });
    const onCreated = vi.fn();

    render(<CreateGroupForm onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText("Group Name"), {
      target: { value: "!!!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    });
    expect(onCreated).not.toHaveBeenCalled();
  });
});
