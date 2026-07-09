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
}

/** A single transfer row: marker icon + category/amount + from→to sub-line. */
function TransferRow({ transfer, members }: TransferRowProps) {
  const from = members.find((m) => m.id === transfer.fromMemberId);
  const to = members.find((m) => m.id === transfer.toMemberId);
  const fromName = from?.name ?? transfer.fromMemberName;
  const toName = to?.name ?? transfer.toMemberName;
  return (
    <div data-testid="transfer-row" className="flex items-center gap-3 py-2">
      <span
        className="grid place-items-center size-9 shrink-0 rounded-lg bg-brand-transfer/10 text-brand-transfer"
        aria-hidden
      >
        <ArrowRightLeft size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {transfer.categoryName}
          </p>
          <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono tnum">
            {formatCurrency(transfer.amount)}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500 truncate">
          <Avatar
            size="xs"
            name={fromName}
            colorIndex={from?.colorIndex ?? 0}
          />
          <span>{fromName.split(" ")[0]}</span>
          <ArrowRight size={12} aria-hidden />
          <Avatar size="xs" name={toName} colorIndex={to?.colorIndex ?? 0} />
          <span>{toName.split(" ")[0]}</span>
        </p>
      </div>
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
            transfers.map((transfer) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                members={members}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
