import { Card } from '../../../shared/ui/Card';
import { formatCurrency } from '../../../shared/api/dashboardUtils';
import { ArrowRightLeft, Filter } from 'lucide-react';
import { useTransfersList, useDashboardSummary } from '../../../shared/api/dashboardHooks';
import { useParams } from 'react-router-dom';

export function TransfersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: summary } = useDashboardSummary(groupId ?? null);
  const { data: transfersList, loading } = useTransfersList(groupId ?? null, 50);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Budget Transfers</h1>
          <p className="text-slate-500">History of transfers for {summary?.groupName}</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors">
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </header>

      <Card>
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-balance"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transfersList?.transfers.length === 0 ? (
              <div className="py-20 text-center text-slate-500">No transfers found.</div>
            ) : (
              transfersList?.transfers.map((transfer) => (
                <div key={transfer.id} className="py-4 flex items-center gap-4 first:pt-0 last:pb-0">
                  <div className="p-3 bg-brand-transfer/10 text-brand-transfer rounded-xl">
                    <ArrowRightLeft size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">{transfer.categoryName}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(transfer.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>{transfer.fromMemberName} → {transfer.toMemberName}</span>
                      <span>{new Date(transfer.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
