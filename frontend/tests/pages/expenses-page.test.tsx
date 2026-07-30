import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ExpenseForm } from "@/features/expense/ExpenseForm";
import { ExpensesPage } from "@/pages/expenses/ui/ExpensesPage";
import { expenseApi } from "@/entities/expense";
import { useIsMobile } from "@/shared/lib/hooks/useIsMobile";
import { useDashboardSummary } from "@/shared/api/dashboardHooks";

vi.mock("@/entities/expense", () => ({
  expenseApi: {
    log: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteAll: vi.fn().mockResolvedValue(undefined),
  },
}));

// `useIsMobile` defaults to desktop (false) so it's unaffected by these
// overrides unless a test explicitly opts into mobile.
vi.mock("@/shared/lib/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", email: "test@example.com" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/app/providers/ActiveGroupContext", () => ({
  useSetActiveGroup: vi.fn(),
}));

vi.mock("@/shared/api/dashboardHooks", () => ({
  useDashboardSummary: vi.fn(),
  useCategoriesList: () => ({ data: [], loading: false }),
  useExpensesList: () => ({
    data: { expenses: [], pagination: { total: 0, limit: 25, offset: 0 } },
    loading: false,
    refresh: vi.fn(),
  }),
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

describe("ExpensesPage — mobile Add Expense FAB", () => {
  beforeEach(() => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: {
        groupName: "Test Group",
        ownerId: "1",
        totalIncome: 5000,
        totalBudget: 4000,
        totalSpent: 1000,
        members: [
          {
            id: "mem-1",
            userId: "1",
            name: "Alice",
            income: 3000,
            share: 60,
            spent: 500,
            remainingQuota: 1000,
            budgeted: 3000,
          },
        ],
        recentExpenses: [],
        recentTransfers: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
      isInitialLoading: false,
    });
  });

  it("hides the header Add Expense button and shows a FAB that opens the existing add-expense dialog on mobile", async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ExpensesPage />
      </MemoryRouter>,
    );

    const header = screen
      .getByRole("heading", { name: /All Expenses/i })
      .closest("header");
    if (!header) throw new Error("Expenses header not found");

    expect(
      within(header).queryByRole("button", { name: /Add Expense/i }),
    ).not.toBeInTheDocument();

    const fab = screen.getByRole("button", { name: /Add Expense/i });
    expect(fab).toBeInTheDocument();

    await user.click(fab);

    expect(
      screen.getByPlaceholderText("e.g. Groceries, Electricity bill"),
    ).toBeInTheDocument();
  });

  it("keeps the header Add Expense button and renders no FAB on desktop", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <MemoryRouter>
        <ExpensesPage />
      </MemoryRouter>,
    );

    const header = screen
      .getByRole("heading", { name: /All Expenses/i })
      .closest("header");
    if (!header) throw new Error("Expenses header not found");

    expect(
      within(header).getByRole("button", { name: /Add Expense/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Add Expense/i }),
    ).toHaveLength(1);
  });

  it("disables the mobile FAB while the dashboard summary is still loading", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
      isInitialLoading: true,
    });

    render(
      <MemoryRouter>
        <ExpensesPage />
      </MemoryRouter>,
    );

    const fab = screen.getByRole("button", { name: /Add Expense/i });
    expect(fab).toBeDisabled();
  });
});
