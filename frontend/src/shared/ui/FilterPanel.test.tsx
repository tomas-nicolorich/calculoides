import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FilterPanel } from "./FilterPanel";

describe("FilterPanel", () => {
  it("renders toggle button closed by default", () => {
    render(
      <FilterPanel activeCount={0} onClear={vi.fn()}>
        <input placeholder="filter-field" />
      </FilterPanel>,
    );
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("filter-field")).not.toBeInTheDocument();
  });

  it("toggles open/closed on click", async () => {
    const user = userEvent.setup();
    render(
      <FilterPanel activeCount={0} onClear={vi.fn()}>
        <input placeholder="filter-field" />
      </FilterPanel>,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByPlaceholderText("filter-field")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide Filters" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide Filters" }));
    expect(screen.queryByPlaceholderText("filter-field")).not.toBeInTheDocument();
  });

  it("shows count in toggle label when activeCount > 0", () => {
    render(
      <FilterPanel activeCount={2} onClear={vi.fn()}>
        <span />
      </FilterPanel>,
    );
    expect(screen.getByRole("button", { name: "Filters (2)" })).toBeInTheDocument();
  });

  it("shows no count in toggle label when activeCount === 0", () => {
    render(
      <FilterPanel activeCount={0} onClear={vi.fn()}>
        <span />
      </FilterPanel>,
    );
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("shows Clear button only when activeCount > 0 and panel is open", async () => {
    const user = userEvent.setup();
    render(
      <FilterPanel activeCount={2} onClear={vi.fn()}>
        <span />
      </FilterPanel>,
    );
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filters (2)" }));
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("does not show Clear button when activeCount === 0 even when open", async () => {
    const user = userEvent.setup();
    render(
      <FilterPanel activeCount={0} onClear={vi.fn()}>
        <span />
      </FilterPanel>,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("calls onClear when Clear is clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <FilterPanel activeCount={1} onClear={onClear}>
        <span />
      </FilterPanel>,
    );
    await user.click(screen.getByRole("button", { name: "Filters (1)" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
