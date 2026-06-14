import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface Transfer {
  id: string;
  categoryName: string;
  fromMemberName: string;
  toMemberName: string;
  amount: number;
  date: string;
}

interface BudgetTransfersProps {
  transfers: Transfer[];
}

export function BudgetTransfers({ transfers }: BudgetTransfersProps) {
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
              <div
                key={transfer.id}
                data-testid="transfer-row"
                className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-slate-200 dark:border-slate-700 p-2 rounded-lg"
              >
                <div className="p-2 bg-brand-transfer/10 text-brand-transfer rounded-lg">
                  <ArrowRightLeft size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {transfer.categoryName}
                    </p>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono tnum">
                      {formatCurrency(transfer.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {transfer.fromMemberName} → {transfer.toMemberName}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
