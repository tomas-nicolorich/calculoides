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
import { PersonalInfoForm } from "./PersonalInfoForm";

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
}));

vi.mock("../../../../lib/actions/user", () => ({
  upsert: upsertMock,
}));

describe("PersonalInfoForm", () => {
  afterEach(() => {
    cleanup();
    upsertMock.mockReset();
  });

  it("saves the trimmed name and shows a success message", async () => {
    upsertMock.mockResolvedValue({ ok: true });

    render(
      <PersonalInfoForm initialName="Jane" initialUsedFallbackName={false} />,
    );
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "  Jane Doe  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Profile" }));

    await waitFor(() => {
      expect(
        screen.getByText("Profile updated successfully!"),
      ).toBeInTheDocument();
    });
    expect(upsertMock).toHaveBeenCalledWith({ name: "Jane Doe" });
  });

  it("rejects an empty name without calling the Server Action", () => {
    render(
      <PersonalInfoForm initialName="Jane" initialUsedFallbackName={false} />,
    );
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "   " },
    });

    expect(
      screen.getByRole("button", { name: "Update Profile" }),
    ).toBeDisabled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("shows a generic error when the Server Action reports failure", async () => {
    upsertMock.mockResolvedValue({ ok: false });

    render(
      <PersonalInfoForm initialName="Jane" initialUsedFallbackName={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Update Profile" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't save your changes. Please try again.",
      );
    });
  });

  it("shows the fallback-name hint until the name is saved", async () => {
    upsertMock.mockResolvedValue({ ok: true });

    render(
      <PersonalInfoForm
        initialName="jane@example.com"
        initialUsedFallbackName={true}
      />,
    );
    expect(
      screen.getByText(/We didn't find a display name/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Jane Doe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Profile" }));

    await waitFor(() => {
      expect(
        screen.getByText("Profile updated successfully!"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/We didn't find a display name/),
    ).not.toBeInTheDocument();
  });
});
