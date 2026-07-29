import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExpenseForm } from "@/features/expense/ExpenseForm";
import { expenseApi } from "@/entities/expense";

vi.mock("@/entities/expense", () => ({
  expenseApi: {
    log: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/shared/lib/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}

// Mock Select and Input UI components since they have custom markup/logic
vi.mock("@/shared/ui/Select", () => ({
  Select: ({ value, onValueChange, options, placeholder }: SelectProps) => (
    <select
      value={value}
      onChange={(e) => {
        onValueChange(e.target.value);
      }}
      data-testid="mock-select"
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

describe("ExpenseForm Edit and Delete Flow", () => {
  const categories = [
    { id: "cat-1", name: "Groceries", monthlyBudget: 500, balances: [] },
  ];
  const members = [{ id: "mem-1", name: "Alice" }];
  const mockExpense = {
    id: "exp-1",
    description: "Original description",
    amount: 50,
    categoryId: "cat-1",
    payerId: "mem-1",
    date: "2026-06-26T12:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-populates fields in edit mode and updates expense on submit", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <ExpenseForm
        groupId="group-1"
        categories={categories}
        members={members}
        expense={mockExpense}
        onSuccess={onSuccess}
      />,
    );

    const descInput = screen.getByPlaceholderText(
      "e.g. Groceries, Electricity bill",
    );
    expect((descInput as HTMLInputElement).value).toBe("Original description");

    const amountInput = screen.getByPlaceholderText("0.00");
    expect((amountInput as HTMLInputElement).value).toBe("50");

    expect(
      screen.getByRole("button", { name: /26 Jun 2026/i }),
    ).toBeInTheDocument();

    // Change description
    await user.clear(descInput);
    await user.type(descInput, "New description");

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    await user.click(submitBtn);

    expect(expenseApi.update).toHaveBeenCalledWith("exp-1", {
      description: "New description",
      amount: 50,
      categoryId: "cat-1",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      date: expect.any(String),
      payerId: "mem-1",
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("renders a Delete button when onDelete is provided", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <ExpenseForm
        groupId="group-1"
        categories={categories}
        members={members}
        expense={mockExpense}
        onDelete={onDelete}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    expect(deleteBtn).toBeInTheDocument();

    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalled();
  });
});
