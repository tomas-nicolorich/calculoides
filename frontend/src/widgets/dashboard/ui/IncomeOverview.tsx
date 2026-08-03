import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { Avatar } from "../../../shared/ui/Avatar";
import { Alert, Button, IconButton, Input } from "../../../shared/ui";
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
  /** Group whose summary/budget queries are invalidated after a successful
   * income save (shares, quotas, and ceilings all derive from income). */
  groupId: string;
}

export function IncomeOverview({
  totalIncome,
  members,
  groupId,
}: IncomeOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const session = useIncomeSession(isEditing ? members : null, groupId);
  const loading = session.phase === "saving";

  const withIndex = members.map((m, i) => ({
    ...m,
    colorIndex: m.colorIndex ?? i,
  }));

  const isMemberInputInvalid = (memberId: string) => {
    const raw = rawInputs[memberId] ?? "";
    const parsed = parseFloat(raw);
    return raw.trim() === "" || isNaN(parsed) || parsed < 0;
  };
  const invalidMembers = withIndex.filter((m) => isMemberInputInvalid(m.id));
  const hasInvalidInput = invalidMembers.length > 0;
  const validationError = hasInvalidInput
    ? `Enter a valid non-negative income for ${invalidMembers.map((m) => m.name).join(", ")}.`
    : null;

  const handleEdit = () => {
    setRawInputs(
      Object.fromEntries(members.map((m) => [m.id, String(m.income)])),
    );
    setIsEditing(true);
  };

  const handleClose = () => {
    session.cancelSession();
    setRawInputs({});
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
    if (hasInvalidInput) return;
    if (await session.saveSession()) {
      setRawInputs({});
      setIsEditing(false);
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

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[60ch]">
            Updating income re-splits every quota, category, and savings goal by
            the new percentages.
          </p>

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
            {withIndex.map((m) => {
              const invalid = isMemberInputInvalid(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 min-w-0">
                    <Avatar name={m.name} colorIndex={m.colorIndex} size="xs" />
                    <span className="truncate">{m.name}</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                      {(session.shares[m.id] ?? 0).toFixed(1)}%
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      step="0.01"
                      prefix="€"
                      aria-label={`Income for ${m.name}`}
                      aria-invalid={invalid}
                      className={`h-8 w-28 font-mono tabular-nums text-xs ${invalid ? "border-brand-expense focus:border-brand-expense" : "border-brand-balance/30 focus:border-brand-balance"} ${NO_SPINNER_CLASS}`}
                      disabled={loading}
                      value={rawInputs[m.id] ?? ""}
                      onChange={(e) => {
                        handleChange(m.id, e.target.value);
                      }}
                    />
                  </span>
                </div>
              );
            })}
          </div>

          {(validationError ?? session.saveError) && (
            <Alert>{validationError ?? session.saveError}</Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-xl text-xs font-bold tracking-widest uppercase"
              onClick={handleClose}
              disabled={loading}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="balance"
              className="flex-1 h-9 rounded-xl text-xs font-bold tracking-widest uppercase"
              onClick={() => {
                void handleConfirm();
              }}
              disabled={loading}
            >
              {loading ? "Saving..." : "Confirm"}
            </Button>
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
