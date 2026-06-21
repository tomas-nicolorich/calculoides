import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../../../shared/ui/Avatar";

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
}

interface TransferRowProps {
  transfer: Transfer;
  members: TransferMember[];
}

/** A single transfer: payer avatar → recipient avatar, resolved by id. */
function TransferRow({ transfer, members }: TransferRowProps) {
  const from = members.find((m) => m.id === transfer.fromMemberId);
  const to = members.find((m) => m.id === transfer.toMemberId);
  const fromName = from?.name ?? transfer.fromMemberName;
  const toName = to?.name ?? transfer.toMemberName;
  return (
    <div
      data-testid="transfer-row"
      className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-slate-200 dark:border-slate-700 p-2 rounded-lg"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <Avatar size="sm" name={fromName} colorIndex={from?.colorIndex ?? 0} />
        <ArrowRight size={16} className="text-brand-transfer" aria-hidden />
        <Avatar size="sm" name={toName} colorIndex={to?.colorIndex ?? 0} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {transfer.categoryName}
          </p>
          <span className="text-sm font-semibold text-brand-transfer font-mono tnum">
            {formatCurrency(transfer.amount)}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {fromName} → {toName}
        </p>
      </div>
    </div>
  );
}

export function BudgetTransfers({ transfers, members }: BudgetTransfersProps) {
  return (
    <Card title="Budget Transfers">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">
            Recent transfers within group
          </div>
          <Link
            to="/transfers"
            className="text-sm font-medium text-brand-balance hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="space-y-4">
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
