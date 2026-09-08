"use client";

import { useEffect, useRef, useState } from "react";
import { Edit2 } from "lucide-react";
import { Avatar, Button, IconButton, Input, Alert, Card } from "../../../../_ui";
import { StatFigure, MemberBar } from "../../../../_ui/money";
import { IncomeOverviewSkeleton } from "../_skeletons";
import { formatCurrency } from "../../../../../lib/format-currency";
import { useDashboardSummary } from "../../../../_data/summary";
import { useUpdateIncome } from "../../../../_data/members";

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Matches the enter transition below so the panel fades/slides out
// symmetrically before unmounting, instead of disappearing instantly.
const CLOSE_ANIMATION_MS = 200;

interface IncomeMember {
  id: string;
  name: string;
  income: number;
}

/**
 * Live total/shares while editing (main's `useIncomeSession`, simplified): a
 * member with an invalid/empty draft keeps contributing their last saved
 * income to the total rather than dropping out of it mid-edit. Recomputed on
 * every render (not memoized) to match the prior inline derivation exactly.
 */
function computeLiveIncomeTotals(
  members: IncomeMember[],
  rawInputs: Record<string, string>,
) {
  const isMemberInputInvalid = (memberId: string) => {
    const raw = rawInputs[memberId] ?? "";
    const parsed = parseFloat(raw);
    return raw.trim() === "" || isNaN(parsed) || parsed < 0;
  };

  const invalidMembers = members.filter((m) => isMemberInputInvalid(m.id));
  const hasInvalidInput = invalidMembers.length > 0;
  const validationError = hasInvalidInput
    ? `Enter a valid non-negative income for ${invalidMembers
        .map((m) => m.name)
        .join(", ")}.`
    : null;

  const overrideAmounts: Record<string, number> = Object.fromEntries(
    members.map((m) => {
      const parsed = parseFloat(rawInputs[m.id] ?? "");
      return [m.id, !isNaN(parsed) && parsed >= 0 ? parsed : m.income];
    }),
  );
  const liveTotal = Object.values(overrideAmounts).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const liveShares: Record<string, number> = Object.fromEntries(
    Object.entries(overrideAmounts).map(([memberId, amount]) => [
      memberId,
      liveTotal > 0 ? (amount / liveTotal) * 100 : 0,
    ]),
  );

  return {
    isMemberInputInvalid,
    hasInvalidInput,
    validationError,
    liveTotal,
    liveShares,
  };
}

interface IncomeEditPanelProps {
  members: IncomeMember[];
  rawInputs: Record<string, string>;
  liveTotal: number;
  liveShares: Record<string, number>;
  isMemberInputInvalid: (memberId: string) => boolean;
  hasInvalidInput: boolean;
  validationError: string | null;
  saveError: string | null;
  isClosing: boolean;
  isPending: boolean;
  onChange: (memberId: string, value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

interface IncomeMemberRowProps {
  member: IncomeMember;
  colorIndex: number;
  rawValue: string;
  invalid: boolean;
  sharePercent: number;
  disabled: boolean;
  onChange: (value: string) => void;
}

function IncomeMemberRow({
  member,
  colorIndex,
  rawValue,
  invalid,
  sharePercent,
  disabled,
  onChange,
}: IncomeMemberRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 min-w-0">
        <Avatar name={member.name} colorIndex={colorIndex} size="xs" />
        <span className="truncate">{member.name}</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
          {sharePercent.toFixed(1)}%
        </span>
      </span>
      <Input
        type="number"
        step="0.01"
        prefix="€"
        aria-label={`Income for ${member.name}`}
        aria-invalid={invalid}
        className={`h-8 w-28 font-mono tabular-nums text-xs ${NO_SPINNER_CLASS}`}
        disabled={disabled}
        value={rawValue}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

function IncomeEditPanel({
  members,
  rawInputs,
  liveTotal,
  liveShares,
  isMemberInputInvalid,
  hasInvalidInput,
  validationError,
  saveError,
  isClosing,
  isPending,
  onChange,
  onClose,
  onConfirm,
}: IncomeEditPanelProps) {
  const isBusy = isPending || isClosing;
  const errorMessage = validationError ?? saveError;

  return (
    <Card title="Income Overview">
      <div
        className={`space-y-6 transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1 ${
          isClosing ? "opacity-0 -translate-y-1" : ""
        }`}
      >
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[60ch]">
          Updating income re-splits every quota, category, and savings goal
          by the new percentages.
        </p>

        <StatFigure
          label="Total Group Income"
          value={formatCurrency(liveTotal)}
          tone="primary"
        />

        <div className="flex flex-col gap-3">
          {members.map((m, i) => (
            <IncomeMemberRow
              key={m.id}
              member={m}
              colorIndex={i}
              rawValue={rawInputs[m.id] ?? ""}
              invalid={isMemberInputInvalid(m.id)}
              sharePercent={liveShares[m.id] ?? 0}
              disabled={isBusy}
              onChange={(value) => {
                onChange(m.id, value);
              }}
            />
          ))}
        </div>

        {errorMessage && <Alert>{errorMessage}</Alert>}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-9 rounded-xl text-xs font-bold tracking-widest uppercase"
            onClick={onClose}
            disabled={isBusy}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="balance"
            className="flex-1 h-9 rounded-xl text-xs font-bold tracking-widest uppercase"
            onClick={onConfirm}
            disabled={hasInvalidInput || isBusy}
          >
            {isPending ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Ported from `main`'s `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`
 * markup (edit-mode per-member rows + read-mode `MemberBar` legend), including
 * its `variant="balance"` (blue) Confirm button. Data seam: self-subscribes
 * to the hydrated `queryKeys.summary` cache instead of receiving
 * `totalIncome`/`members` as props — same seam `RemainingBalance`/
 * `RecentExpenses` use (spec: "One Server Prefetch Feeds the
 * Summary-Dependent Widgets").
 */
export function IncomeOverview({ groupId }: { groupId: string }) {
  const { data: summary, isLoading, isError } = useDashboardSummary(groupId);
  const updateIncomeMutation = useUpdateIncome(groupId);

  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div data-testid="income-overview-loading">
        <IncomeOverviewSkeleton />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <Card title="Income Overview">
        <p className="text-sm text-brand-expense">
          Failed to load income overview.
        </p>
      </Card>
    );
  }

  const members = summary.members;

  const { isMemberInputInvalid, hasInvalidInput, validationError, liveTotal, liveShares } =
    computeLiveIncomeTotals(members, rawInputs);

  // Schedules the shared close animation: flips `isClosing` so the panel's
  // exit transition plays, then — once it finishes — clears the edit state
  // and unmounts the panel. Shared by the explicit Close button and a
  // successful Confirm save so both close identically.
  const scheduleClose = () => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setRawInputs({});
      setSaveError(null);
      setIsEditing(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
  };

  const handleEdit = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setRawInputs(
      Object.fromEntries(members.map((m) => [m.id, String(m.income)])),
    );
    setSaveError(null);
    setIsClosing(false);
    setIsEditing(true);
  };

  const handleClose = () => {
    scheduleClose();
  };

  // dashboard-view general invalidation contract: only members whose income
  // actually changed are submitted; each `updateIncome` call's own
  // `onSuccess` (`useUpdateIncome`) invalidates `queryKeys.group(groupId)`.
  const handleConfirm = async () => {
    if (hasInvalidInput) return;
    const edited = members.filter(
      (m) => parseFloat(rawInputs[m.id] ?? "") !== m.income,
    );
    setSaveError(null);
    try {
      await Promise.all(
        edited.map((m) =>
          updateIncomeMutation.mutateAsync({
            memberId: m.id,
            income: parseFloat(rawInputs[m.id]),
          }),
        ),
      );
      scheduleClose();
    } catch {
      setSaveError("Failed to save income changes.");
    }
  };

  const handleInputChange = (memberId: string, value: string) => {
    setRawInputs((prev) => ({ ...prev, [memberId]: value }));
  };

  if (isEditing || isClosing) {
    return (
      <IncomeEditPanel
        members={members}
        rawInputs={rawInputs}
        liveTotal={liveTotal}
        liveShares={liveShares}
        isMemberInputInvalid={isMemberInputInvalid}
        hasInvalidInput={hasInvalidInput}
        validationError={validationError}
        saveError={saveError}
        isClosing={isClosing}
        isPending={updateIncomeMutation.isPending}
        onChange={handleInputChange}
        onClose={handleClose}
        onConfirm={() => {
          void handleConfirm();
        }}
      />
    );
  }

  const barMembers = members.map((m, i) => ({
    id: m.id,
    name: m.name,
    share: m.share,
    colorIndex: i,
    amount: formatCurrency(m.income),
  }));

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Income Overview
          </h3>
          <IconButton aria-label="Edit incomes" size="sm" onClick={handleEdit}>
            <Edit2 size={14} />
          </IconButton>
        </div>
        <StatFigure
          label="Total Group Income"
          value={formatCurrency(summary.totalIncome)}
          tone="primary"
        />
        <MemberBar members={barMembers} legend emptyMessage="No members yet" />
      </div>
    </Card>
  );
}
