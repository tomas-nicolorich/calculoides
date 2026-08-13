// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { IconPicker } from "./IconPicker";

/**
 * PR 15 (task 15.0, spec `ui-design-system`): ported verbatim from `main`'s
 * `shared/ui/IconPicker.tsx` — a Base UI `Popover`-backed, searchable,
 * grouped icon picker over `categoryIcons.tsx`'s `CATEGORY_ICON_GROUPS`.
 * Moved here from PR 6 (2026-08-12 scope decision) since this PR is
 * IconPicker's actual consumer.
 */
describe("IconPicker", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the trigger with the current icon's label", () => {
    render(<IconPicker icon="rent" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Choose icon" }),
    ).toHaveTextContent("Rent");
  });

  it("opens the popover and lists icons grouped by section", () => {
    render(<IconPicker icon="rent" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }));

    expect(screen.getByPlaceholderText("Search icons...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /icon: rent/i }),
    ).toBeInTheDocument();
  });

  it("filters the icon list by the search query", () => {
    render(<IconPicker icon="rent" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }));
    fireEvent.change(screen.getByPlaceholderText("Search icons..."), {
      target: { value: "grocer" },
    });

    expect(
      screen.getByRole("button", { name: /icon: groceries/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /icon: rent/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a 'No icons found' message when the search matches nothing", () => {
    render(<IconPicker icon="rent" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }));
    fireEvent.change(screen.getByPlaceholderText("Search icons..."), {
      target: { value: "zzzznotanicon" },
    });

    expect(screen.getByText("No icons found")).toBeInTheDocument();
  });

  it("calls onChange with the selected icon key and closes the popover", () => {
    const onChange = vi.fn();
    render(<IconPicker icon="rent" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }));
    fireEvent.click(screen.getByRole("button", { name: /icon: groceries/i }));

    expect(onChange).toHaveBeenCalledWith("groceries");
    expect(
      screen.queryByPlaceholderText("Search icons..."),
    ).not.toBeInTheDocument();
  });

  it("marks the currently selected icon as pressed", () => {
    render(<IconPicker icon="rent" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }));

    expect(
      screen.getByRole("button", { name: /icon: rent/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the trigger when disabled is passed", () => {
    render(<IconPicker icon="rent" onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: "Choose icon" })).toBeDisabled();
  });
});
