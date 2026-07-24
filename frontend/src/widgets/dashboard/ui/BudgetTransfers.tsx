import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { Avatar } from "../../../shared/ui/Avatar";
import { Link } from "react-router-dom";

interface Transfer {
  id: string;
  categoryName: string;
  fromMemberName: string;
  fromMemberId: string;
  toMemberName: string;
  toMemberId: string;
  amount: number;
  date: string;
}

interface TransferMember {
  id: string;
  name: string;
  colorIndex: number;
}

interface BudgetTransfersProps {
  transfers: Transfer[];
  members: TransferMember[];
  groupId: string;
}

interface TransferRowProps {
  transfer: Transfer;
  members: TransferMember[];
  index: number;
}

function resolveMemberDisplay(
  member: TransferMember | undefined,
  fallbackName: string,
) {
  return {
    name: member?.name ?? fallbackName,
    colorIndex: member?.colorIndex ?? 0,
  };
}

/** A single transfer row: marker icon + from→to sub-line + amount. */
function TransferRow({ transfer, members, index }: TransferRowProps) {
  const from = resolveMemberDisplay(
    members.find((m) => m.id === transfer.fromMemberId),
    transfer.fromMemberName,
  );
  const to = resolveMemberDisplay(
    members.find((m) => m.id === transfer.toMemberId),
    transfer.toMemberName,
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
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {transfer.categoryName}
        </p>
        <p className="flex items-center gap-1 text-xs text-slate-500 truncate">
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

export function BudgetTransfers({
  transfers,
  members,
  groupId,
}: BudgetTransfersProps) {
  return (
    <Card title="Budget Transfers">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">
            Money moved between members
          </div>
          <Link
            to={`/transfers/${groupId}`}
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
