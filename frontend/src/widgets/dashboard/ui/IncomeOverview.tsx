import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { IconButton, Input } from "../../../shared/ui";
import { StatFigure, MemberBar } from "../../../shared/ui/money";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { useIncomeSession } from "../../../entities/member/useIncomeSession";

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

interface IncomeOverviewProps {
  totalIncome: number;
  members: {
    id: string;
    name: string;
    income: number;
    share: number;
    /**
     * Stable palette index (join order); same colour everywhere. Defaults to
     * array position when omitted, for back-compat with bare callers.
     */
    colorIndex?: number;
  }[];
  /** Invoked after a successful save so the dashboard can refetch summary
   * data (shares, quotas, ceilings) without a full page reload. */
  onRefresh?: () => void | Promise<void>;
}

export function IncomeOverview({
  totalIncome,
  members,
  onRefresh,
}: IncomeOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const session = useIncomeSession(isEditing ? members : null);
  const loading = session.phase === "saving";

  const withIndex = members.map((m, i) => ({
    ...m,
    colorIndex: m.colorIndex ?? i,
  }));

  const handleEdit = () => {
    setRawInputs(
      Object.fromEntries(members.map((m) => [m.id, String(m.income)])),
    );
    setValidationError(null);
    setIsEditing(true);
  };

  const handleClose = () => {
    session.cancelSession();
    setRawInputs({});
    setValidationError(null);
    setIsEditing(false);
  };

  const handleChange = (memberId: string, raw: string) => {
    setRawInputs((prev) => ({ ...prev, [memberId]: raw }));
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      session.overrideIncome(memberId, parsed);
    }
  };

  const handleConfirm = async () => {
    const hasInvalidInput = Object.values(rawInputs).some((raw) => {
      const parsed = parseFloat(raw);
      return raw.trim() === "" || isNaN(parsed) || parsed < 0;
    });
    if (hasInvalidInput) {
      setValidationError("Enter a valid non-negative income for every member.");
      return;
    }
    setValidationError(null);
    if (await session.saveSession()) {
      setRawInputs({});
      setIsEditing(false);
      await onRefresh?.();
    }
  };

  if (isEditing) {
    return (
      <Card>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Income Overview
            </h3>
          </div>

          <StatFigure
            label="Total Group Income"
            value={formatCurrency(
              Object.values(session.overrideAmounts).reduce(
                (sum, amount) => sum + amount,
                0,
              ),
            )}
            tone="primary"
          />

          <div className="flex flex-col gap-3">
            {withIndex.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 min-w-0">
                  <span
                    className="h-3 w-3 flex-none rounded-full"
                    style={{
                      background: `var(--color-member-${((m.colorIndex % 10) + 1).toString()})`,
                    }}
                  />
                  <span className="truncate">{m.name}</span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                    {(session.shares[m.id] ?? 0).toFixed(1)}%
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-500 dark:text-slate-400">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    aria-label={`Income for ${m.name}`}
                    className={`h-8 w-28 text-right text-xs bg-white dark:bg-slate-950 border-brand-balance/30 focus:border-brand-balance ${NO_SPINNER_CLASS}`}
                    disabled={loading}
                    value={rawInputs[m.id] ?? ""}
                    onChange={(e) => {
                      handleChange(m.id, e.target.value);
                    }}
                  />
                </span>
              </div>
            ))}
          </div>

          {(validationError ?? session.saveError) && (
            <div className="text-[10px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30">
              {validationError ?? session.saveError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              onClick={handleClose}
              disabled={loading}
            >
              Close
            </button>
            <button
              type="button"
              className="flex-1 h-9 rounded-xl bg-brand-balance text-white text-xs font-bold tracking-widest uppercase disabled:opacity-50"
              onClick={() => {
                void handleConfirm();
              }}
              disabled={loading}
            >
              {loading ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </Card>
    );
  }

  const barMembers = withIndex.map((m) => ({
    id: m.id,
    name: m.name,
    share: m.share,
    colorIndex: m.colorIndex,
    amount: formatCurrency(m.income),
  }));

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Income Overview
          </h3>
          <IconButton aria-label="Edit incomes" size="sm" onClick={handleEdit}>
            <Edit2 size={14} />
          </IconButton>
        </div>
        <StatFigure
          label="Total Group Income"
          value={formatCurrency(totalIncome)}
          tone="primary"
        />
        <MemberBar members={barMembers} legend emptyMessage="No members yet" />
      </div>
    </Card>
  );
}
