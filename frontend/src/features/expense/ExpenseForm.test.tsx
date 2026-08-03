import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { QueryWrapper } from "../../test/queryTestUtils";
import { vi, describe, it, expect } from "vitest";

function render(ui: ReactElement) {
  return rtlRender(<QueryWrapper>{ui}</QueryWrapper>);
}

vi.mock("../../entities/expense", () => ({
  expenseApi: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../shared/ui", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
  }) => <button {...props}>{children}</button>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  DatePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      aria-label="date"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    />
  ),
  Select: ({
    options,
    placeholder,
  }: {
    options: { value: string; label: string }[];
    placeholder?: string;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <select aria-label={placeholder ?? "select"}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const mockCategories = [
  {
    id: "cat-1",
    name: "Groceries",
    icon: "🛒",
    budget: 500,
    spent: 100,
    spentPct: 20,
    breakdown: [],
  },
  {
    id: "cat-2",
    name: "Transport",
    icon: "🚗",
    budget: 200,
    spent: 50,
    spentPct: 25,
    breakdown: [],
  },
];

const mockMembers = [{ id: "mem-1", name: "Alice" }];

describe("ExpenseForm", () => {
  it("renders category options with name only — no icon prefix", () => {
    render(
      <ExpenseForm
        groupId="group-1"
        categories={mockCategories as never}
        members={mockMembers}
      />,
    );

    const groceriesOption = screen.getByRole("option", { name: "Groceries" });
    const transportOption = screen.getByRole("option", { name: "Transport" });

    expect(groceriesOption).toBeInTheDocument();
    expect(transportOption).toBeInTheDocument();

    expect(groceriesOption.textContent).toBe("Groceries");
    expect(transportOption.textContent).toBe("Transport");
  });

  it("does not include icon characters in category option labels", () => {
    render(
      <ExpenseForm
        groupId="group-1"
        categories={mockCategories as never}
        members={mockMembers}
      />,
    );

    const options = screen.getAllByRole("option");
    const categoryOptions = options.filter((o) =>
      ["cat-1", "cat-2"].includes(o.getAttribute("value") ?? ""),
    );

    for (const option of categoryOptions) {
      // Labels must not start with an emoji/icon — no leading non-letter character
      expect(option.textContent).toMatch(/^[A-Za-z]/);
    }
  });
});
