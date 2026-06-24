import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BudgetCategories } from "./BudgetCategories";
import type { CategoryWithBalances } from "../../../../../shared/src/types/redesign";

vi.mock("../../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../shared/api/client", () => ({
  apiClient: { fetch: mockFetch },
}));

// Render the custom Select as a native <select> so tests can drive it with fireEvent.change
vi.mock("../../../shared/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/ui")>();
  return {
    ...actual,
    Select: ({
      options,
      placeholder,
      value,
      onValueChange,
    }: {
      options: { value: string; label: string; disabled?: boolean }[];
      placeholder?: string;
      value?: string;
      onValueChange?: (v: string) => void;
    }) => (
      <select
        aria-label={placeholder ?? "select"}
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="" disabled>
          {placeholder ?? "Select..."}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    ),
  };
});

const members = [
  { id: "m1", name: "Alice Smith", income: 3000, share: 60, index: 0 },
  { id: "m2", name: "Bob Jones", income: 2000, share: 40, index: 1 },
];

function makeCategory(
  overrides: Partial<CategoryWithBalances> = {},
): CategoryWithBalances {
  return {
    id: "cat-1",
    name: "Rent",
    monthlyBudget: 1000,
    icon: "rent",
    balances: [],
    ...overrides,
  };
}

function renderWidget(categories: CategoryWithBalances[]) {
  return render(
    <BudgetCategories
      categories={categories}
      isOwner
      onDelete={vi.fn()}
      groupId="group-1"
      members={members}
      onRefresh={vi.fn()}
    />,
  );
}

describe("BudgetCategories category icon tile", () => {
  it("renders a violet tile for a known icon key", () => {
    renderWidget([makeCategory({ icon: "rent" })]);
    const tile = screen.getByRole("img", { name: "rent" });
    expect(tile).toBeInTheDocument();
    expect(tile.className).toContain("bg-brand-category/10");
    expect(tile.className).toContain("text-brand-category");
    expect(tile.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the Folder fallback (labelled 'other') for an unknown/legacy icon", () => {
    renderWidget([makeCategory({ id: "cat-2", name: "Legacy", icon: "💰" })]);
    const tile = screen.getByRole("img", { name: "other" });
    expect(tile).toBeInTheDocument();
    expect(tile.querySelector("svg")).toBeInTheDocument();
  });
});

describe("BudgetCategories category header — progress meter", () => {
  it("shows '40% spent' label on the header progress meter (40% spend)", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 240, remainingQuota: 360 },
          { memberId: "m2", quota: 400, spent: 160, remainingQuota: 240 },
        ],
      }),
    ]);
    // totalSpent = 400, budget = 1000 → 40%
    expect(screen.getByText("40% spent")).toBeInTheDocument();
  });

  it("shows '79% spent' and does NOT render a spent badge/pill in header", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 790, remainingQuota: 210 },
        ],
      }),
    ]);
    expect(screen.getByText("79% spent")).toBeInTheDocument();
    // No standalone "79%" badge separate from the "79% spent" label
    expect(screen.queryByText("79%")).not.toBeInTheDocument();
  });

  it("shows '80% spent' at the 80% boundary", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 800, remainingQuota: 200 },
        ],
      }),
    ]);
    expect(screen.getByText("80% spent")).toBeInTheDocument();
  });

  it("shows '101% spent' when over budget", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 1010, remainingQuota: -10 },
        ],
      }),
    ]);
    expect(screen.getByText("101% spent")).toBeInTheDocument();
  });
});

describe("BudgetCategories member row (expanded)", () => {
  const categoryWithBalances = makeCategory({
    monthlyBudget: 1000,
    balances: [
      // Alice: 60%, quota 600, spent 240 → remaining 360
      { memberId: "m1", quota: 600, spent: 240, remainingQuota: 360 },
      // Bob: 40%, quota 400, spent 450 → over by 50
      { memberId: "m2", quota: 400, spent: 450, remainingQuota: -50 },
    ],
  });

  function expandCategory() {
    const header = screen.getByRole("button", { name: /rent/i });
    fireEvent.click(header);
  }

  it("shows first name, share percent, and budgeted amount for each member", () => {
    renderWidget([categoryWithBalances]);
    expandCategory();

    // Alice row
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Bob row
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // Share percents (from categoryMemberShare with income 3000/2000 → 60/40)
    // Displayed as pills: 60.0% and 40.0%
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("share pill carries member colour as inline style", () => {
    renderWidget([categoryWithBalances]);
    expandCategory();
    // Alice has index 0 → color-member-1
    const alicePill = screen.getByText("60.0%");
    expect(alicePill).toHaveStyle({ color: "var(--color-member-1)" });
    // Bob has index 1 → color-member-2
    const bobPill = screen.getByText("40.0%");
    expect(bobPill).toHaveStyle({ color: "var(--color-member-2)" });
  });

  it("shows 'Spent: x' for each member", () => {
    renderWidget([categoryWithBalances]);
    expandCategory();

    // Just verify the "Spent:" prefix appears for both members
    const spentLabels = screen.getAllByText(/^Spent:/);
    expect(spentLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("shows 'x left' for a member under budget", () => {
    renderWidget([categoryWithBalances]);
    expandCategory();

    // Alice: remaining 360 → "left"
    const leftEl = screen.getByText(/left$/);
    expect(leftEl).toBeInTheDocument();
  });

  it("shows 'x over' in red for an overspent member", () => {
    renderWidget([categoryWithBalances]);
    expandCategory();

    // Bob: remainingQuota = -50 → "over"
    const overEl = screen.getByText(/over$/);
    expect(overEl).toBeInTheDocument();
    expect(overEl.className).toContain("text-brand-expense");
  });

  it("renders transfer buttons for each member row", () => {
    renderWidget([categoryWithBalances]);
    expandCategory();

    expect(
      screen.getByRole("button", { name: "Transfer from Alice Smith" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Transfer from Bob Jones" }),
    ).toBeInTheDocument();
  });
});

describe("BudgetCategories category header — progress meter urgency state", () => {
  it("data-state is 'on-track' when spend < 80%", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 700, remainingQuota: 300 },
        ],
      }),
    ]);
    const bars = screen.getAllByRole("progressbar");
    const headerBar = bars[0];
    expect(headerBar).toHaveAttribute("data-state", "on-track");
  });

  it("data-state is 'behind' when spend is 80–100%", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 850, remainingQuota: 150 },
        ],
      }),
    ]);
    const bars = screen.getAllByRole("progressbar");
    const headerBar = bars[0];
    expect(headerBar).toHaveAttribute("data-state", "behind");
  });

  it("data-state is 'blocked' when spend > 100%", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 1100, remainingQuota: -100 },
        ],
      }),
    ]);
    const bars = screen.getAllByRole("progressbar");
    const headerBar = bars[0];
    expect(headerBar).toHaveAttribute("data-state", "blocked");
  });
});

describe("BudgetCategories member row — progress meter urgency state (expanded)", () => {
  function expandCategory() {
    fireEvent.click(screen.getByRole("button", { name: /rent/i }));
  }

  it("member data-state is 'on-track' when spent < 80% of quota", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 300, remainingQuota: 300 },
        ],
      }),
    ]);
    expandCategory();
    // Only one progressbar after expansion (member row)
    const bars = screen.getAllByRole("progressbar");
    // Last bar is the member bar (header bar first, member bar second)
    const memberBar = bars[bars.length - 1];
    expect(memberBar).toHaveAttribute("data-state", "on-track");
  });

  it("member data-state is 'behind' when spent 80–100% of quota", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 510, remainingQuota: 90 },
        ],
      }),
    ]);
    expandCategory();
    const bars = screen.getAllByRole("progressbar");
    const memberBar = bars[bars.length - 1];
    expect(memberBar).toHaveAttribute("data-state", "behind");
  });

  it("member data-state is 'blocked' when spent > quota", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 700, remainingQuota: -100 },
        ],
      }),
    ]);
    expandCategory();
    const bars = screen.getAllByRole("progressbar");
    const memberBar = bars[bars.length - 1];
    expect(memberBar).toHaveAttribute("data-state", "blocked");
  });
});

describe("BudgetCategories member row — spend label colour (expanded)", () => {
  function expandCategory() {
    fireEvent.click(screen.getByRole("button", { name: /rent/i }));
  }

  it("'x left' label has text-brand-income when on-track (< 80%)", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 300, remainingQuota: 300 },
        ],
      }),
    ]);
    expandCategory();
    const leftEl = screen.getByText(/left$/);
    expect(leftEl.className).toContain("text-brand-income");
  });

  it("'x left' label has text-brand-transfer when behind (80–100%)", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 510, remainingQuota: 90 },
        ],
      }),
    ]);
    expandCategory();
    const leftEl = screen.getByText(/left$/);
    expect(leftEl.className).toContain("text-brand-transfer");
  });

  it("'x over' label has text-brand-expense when blocked (> 100%)", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 600, spent: 700, remainingQuota: -100 },
        ],
      }),
    ]);
    expandCategory();
    const overEl = screen.getByText(/over$/);
    expect(overEl.className).toContain("text-brand-expense");
  });
});

describe("BudgetCategories transfer dialog", () => {
  const categoryWithBalances = makeCategory({
    id: "cat-1",
    name: "Rent",
    monthlyBudget: 1000,
    balances: [
      { memberId: "m1", quota: 600, spent: 240, remainingQuota: 360 },
      { memberId: "m2", quota: 400, spent: 450, remainingQuota: -50 },
    ],
  });

  function openTransferForAlice() {
    // Expand the category
    fireEvent.click(screen.getByRole("button", { name: /rent/i }));
    // Click Alice's transfer button
    fireEvent.click(
      screen.getByRole("button", { name: "Transfer from Alice Smith" }),
    );
  }

  it("locks Alice as the From member when her transfer button is clicked", () => {
    renderWidget([categoryWithBalances]);
    openTransferForAlice();

    // Locked From line should mention Alice and category name in one element
    expect(screen.getByText(/From Alice.*Rent/)).toBeInTheDocument();
  });

  it("dialog title is 'Transfer Budget' and description mentions Alice and category", () => {
    renderWidget([categoryWithBalances]);
    openTransferForAlice();

    expect(
      screen.getByRole("heading", { name: "Transfer Budget" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Move budget from Alice.*share of Rent/),
    ).toBeInTheDocument();
  });

  it("recipient select excludes the source (Alice)", () => {
    renderWidget([categoryWithBalances]);
    openTransferForAlice();

    // The To Member select should have Bob but not Alice
    const select = screen.getByRole("combobox", { name: "Select recipient" });
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Bob Jones");
    expect(options).not.toContain("Alice Smith");
  });

  it("submit button reads 'Send Transfer' and calls apiClient.fetch with correct payload", async () => {
    const onRefresh = vi.fn();
    render(
      <BudgetCategories
        categories={[categoryWithBalances]}
        isOwner
        onDelete={vi.fn()}
        groupId="group-1"
        members={members}
        onRefresh={onRefresh}
      />,
    );

    openTransferForAlice();

    // Pick Bob as recipient
    const select = screen.getByRole("combobox", { name: "Select recipient" });
    fireEvent.change(select, { target: { value: "m2" } });

    // Set amount
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "100" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Send Transfer" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/transactions?action=transfer-create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            categoryId: "cat-1",
            fromMemberId: "m1",
            toMemberId: "m2",
            amount: 100,
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("Cancel button is present in the transfer dialog footer", () => {
    renderWidget([categoryWithBalances]);
    openTransferForAlice();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("Cancel button closes the transfer dialog", () => {
    renderWidget([categoryWithBalances]);
    openTransferForAlice();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("heading", { name: "Transfer Budget" }),
    ).not.toBeInTheDocument();
  });

  it("transfer dialog has no icon-only close button in the header", () => {
    renderWidget([categoryWithBalances]);
    openTransferForAlice();
    // The only buttons inside the dialog should be Cancel and Send Transfer
    // (plus the icon transfer buttons are outside the dialog)
    // Confirm no button exists with empty text content (the X close button)
    const allButtons = screen.getAllByRole("button");
    const iconOnlyButtons = allButtons.filter(
      (btn) => !btn.textContent.trim() && btn.querySelector("svg") !== null,
    );
    expect(iconOnlyButtons).toHaveLength(0);
  });
});
