// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Select } from "./Select";

const OPTIONS = [
  { value: "food", label: "Food" },
  { value: "rent", label: "Rent" },
  { value: "fun", label: "Fun", disabled: true },
];

/**
 * Base UI's `Select.Item` only commits a selection once the item has been
 * pointer-highlighted first — a bare `click` on a non-highlighted item is a
 * no-op. `pointerMove` mirrors the real hover-then-click sequence a mouse
 * user performs.
 */
function selectOption(name: string) {
  const option = screen.getByRole("option", { name });
  fireEvent.pointerMove(option);
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}

/**
 * PR 6 (spec `ui-design-system`): ported verbatim from `main`'s
 * `shared/ui/Select.tsx` — a Base UI `Select`-backed controlled dropdown.
 */
describe("Select", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the placeholder when no value is selected", () => {
    render(<Select options={OPTIONS} placeholder="Choose a category" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a category");
  });

  it("shows the selected option's label for a controlled value", () => {
    render(<Select value="rent" options={OPTIONS} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Rent");
  });

  it("renders every option in the list once opened", () => {
    render(<Select options={OPTIONS} />);

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rent" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fun" })).toBeInTheDocument();
  });

  it("calls onChange with the selected option's value", () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    selectOption("Food");

    expect(onChange).toHaveBeenCalledWith("food");
  });

  it("calls onValueChange with the selected option's value", () => {
    const onValueChange = vi.fn();
    render(<Select options={OPTIONS} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    selectOption("Rent");

    expect(onValueChange).toHaveBeenCalledWith("rent");
  });

  it("does not select a disabled option", () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Fun" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    selectOption("Fun");

    expect(onChange).not.toHaveBeenCalled();
  });
});
