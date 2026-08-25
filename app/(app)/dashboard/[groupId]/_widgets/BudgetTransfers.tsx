"use client";

import Link from "next/link";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { Avatar, Badge, Card } from "../../../../_ui";
import { formatCurrency } from "../../../../../lib/format-currency";
import { useDashboardSummary } from "../../../../_data/summary";

interface TransferMember {
  id: string;
  name: string;
}

interface Transfer {
  id: string;
  categoryName: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

function resolveMemberDisplay(
  member: TransferMember | undefined,
  fallbackName: string,
  colorIndex: number,
) {
  return { name: member?.name ?? fallbackName, colorIndex };
}

/** A single transfer row: marker icon + from→to sub-line + a transfer-tone
 * category badge (ui-design-system: "A transfer-related badge uses the
 * transfer variant") + amount. */
function TransferRow({
  transfer,
  members,
  index,
}: {
  transfer: Transfer;
  members: TransferMember[];
  index: number;
}) {
  const fromIndex = members.findIndex((m) => m.id === transfer.fromMemberId);
  const toIndex = members.findIndex((m) => m.id === transfer.toMemberId);
  const from = resolveMemberDisplay(
    members[fromIndex],
    transfer.fromMemberName,
    fromIndex === -1 ? 0 : fromIndex,
  );
  const to = resolveMemberDisplay(
    members[toIndex],
    transfer.toMemberName,
    toIndex === -1 ? 0 : toIndex,
  );

  return (
    <div
      data-testid="transfer-row"
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
        index % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/40" : ""
      }`}
    >
      <span
        className="grid place-items-center size-9 shrink-0 rounded-lg bg-brand-transfer/10 text-brand-transfer"
        aria-hidden
      >
        <ArrowRightLeft size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <Badge tone="transfer" size="sm" data-testid="transfer-badge">
          {transfer.categoryName}
        </Badge>
        <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 truncate">
          <Avatar size="xs" name={from.name} colorIndex={from.colorIndex} />
          <span>{from.name.split(" ")[0]}</span>
          <ArrowRight size={12} aria-hidden />
          <Avatar size="xs" name={to.name} colorIndex={to.colorIndex} />
          <span>{to.name.split(" ")[0]}</span>
        </p>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono tnum shrink-0">
        {formatCurrency(transfer.amount)}
      </span>
    </div>
  );
}

/**
 * Ported from `main`'s `frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx`
 * read markup (marker icon + from→to sub-line, zebra-striped rows). Data
 * seam: self-subscribes to the hydrated `queryKeys.summary` cache instead of
 * receiving `transfers`/`members` as props (same seam
 * `RemainingBalance`/`RecentExpenses` use). One genuine addition beyond
 * `main` (dashboard-view spec, not a `main` parity requirement): a
 * `Badge tone="transfer"` category tag per row. Transfer creation happens
 * from `BudgetCategories`' member-row transfer icon + shared dialog, mirroring
 * `main` — this widget only links out to a separate `/transfers` page.
 */
export function BudgetTransfers({ groupId }: { groupId: string }) {
  const { data: summary, isLoading, isError } = useDashboardSummary(groupId);

  if (isLoading) {
    return (
      <Card title="Budget Transfers" data-testid="budget-transfers-loading">
        <p className="text-sm text-slate-400">Loading…</p>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card title="Budget Transfers">
        <p className="text-sm text-brand-expense">
          Failed to load budget transfers.
        </p>
      </Card>
    );
  }

  const { recentTransfers: transfers, members } = summary;

  return (
    <Card title="Budget Transfers">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">
            Money moved between members
          </div>
          <Link
            href={`/transfers/${groupId}`}
            className="text-sm font-medium text-brand-balance hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="space-y-2">
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No recent transfers
            </div>
          ) : (
            transfers.map((transfer, index) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                members={members}
                index={index}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
