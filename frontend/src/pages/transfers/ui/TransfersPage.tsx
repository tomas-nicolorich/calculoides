import { useState } from "react";
import { IconButton } from "../../../shared/ui";
import { LoadingCard } from "../../../shared/ui/LoadingCard";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import {
  useTransfersList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { useParams, useNavigate } from "react-router-dom";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { ExpenseFilter } from "../../../features/expense-filtering/ui/ExpenseFilter";

export function TransfersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{
    memberId?: string;
    categoryId?: string;
  }>({});

  const { data: summary } = useDashboardSummary(groupId ?? null);
  const { data: categories } = useCategoriesList(groupId ?? null);
  const { data: transfersList, loading } = useTransfersList(
    groupId ?? null,
    filters.categoryId,
    filters.memberId,
    50,
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <IconButton
          bordered
          hover="balance"
          onClick={() => {
            void navigate(-1);
          }}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </IconButton>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Budget Transfers
          </h1>
          <p className="text-slate-500">
            History of transfers for {summary?.groupName}
          </p>
        </div>
      </header>

      <ExpenseFilter
        onFilterChange={setFilters}
        members={summary?.members ?? []}
        categories={categories}
      />

      <LoadingCard
        loading={loading}
        isEmpty={!transfersList?.transfers.length}
        emptyMessage="No transfers found."
      >
        {transfersList?.transfers.map((transfer) => (
          <div
            key={transfer.id}
            className="py-4 flex items-center gap-4 first:pt-0 last:pb-0"
          >
            <div className="p-3 bg-brand-transfer/10 text-brand-transfer rounded-xl">
              <ArrowRightLeft size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {transfer.categoryName}
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono tnum">
                  {formatCurrency(transfer.amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>
                  {transfer.fromMemberName} → {transfer.toMemberName}
                </span>
                <span>
                  {new Date(transfer.date).toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </LoadingCard>
    </div>
  );
}
