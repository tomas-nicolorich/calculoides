// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GroupSwitcher } from "./GroupSwitcher";

const { useParamsMock, usePathnameMock } = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
  usePathname: usePathnameMock,
}));

const GROUPS = [
  { id: "abc123", name: "Roomies" },
  { id: "group-2", name: "Weekend House" },
];

describe("GroupSwitcher", () => {
  afterEach(() => {
    cleanup();
    useParamsMock.mockReset();
    usePathnameMock.mockReset();
  });

  // "Dashboard route derives groupId..." + ADR-5's usePathname() fallback.
  it.each([
    ["useParams", { groupId: "abc123" }],
    ["usePathname fallback", {}],
  ])("resolves the active group via %s", (_label, params) => {
    useParamsMock.mockReturnValue(params);
    usePathnameMock.mockReturnValue("/dashboard/abc123");
    render(<GroupSwitcher groups={GROUPS} />);
    expect(
      screen.getByRole("button", { name: "Switch group" }),
    ).toHaveTextContent("Roomies");
  });

  // "Switcher lists the signed-in user's groups"
  it("lists every group from the groups prop once opened", () => {
    useParamsMock.mockReturnValue({ groupId: "abc123" });
    usePathnameMock.mockReturnValue("/dashboard/abc123");
    render(<GroupSwitcher groups={GROUPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Switch group" }));
    expect(
      screen.getByRole("menuitem", { name: "Roomies" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Weekend House" }),
    ).toBeInTheDocument();
  });

  // Collapsed rail width — icon-only trigger, no visible label text.
  it("hides the trigger label when collapsed", () => {
    useParamsMock.mockReturnValue({ groupId: "abc123" });
    usePathnameMock.mockReturnValue("/dashboard/abc123");
    render(<GroupSwitcher groups={GROUPS} collapsed />);
    expect(
      screen.getByRole("button", { name: "Switch group" }),
    ).not.toHaveTextContent("Roomies");
  });
});
