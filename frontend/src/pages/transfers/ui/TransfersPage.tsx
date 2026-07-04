import { useState } from "react";
import { Button, Card, IconButton, RowMenu, Select } from "../../../shared/ui";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { CategoryIconTile } from "../../../shared/lib/categoryIcons";
import { useIsMobile } from "../../../shared/lib/hooks/useIsMobile";
import { Avatar } from "../../../shared/ui/Avatar";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useTransfersList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { useParams, useNavigate } from "react-router-dom";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { transferApi } from "../../../entities/transfer";

const PAGE_SIZE = 25;

// fallow-ignore-next-line complexity
export function TransfersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [memberId, setMemberId] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [transferToDelete, setTransferToDelete] = useState<string | null>(null);

  const { data: summary, refresh: refreshSummary } = useDashboardSummary(
    groupId ?? null,
  );
  const { data: categories } = useCategoriesList(groupId ?? null);
  const {
    data: transfersList,
    loading,
    refresh: refreshTransfers,
  } = useTransfersList(
    groupId ?? null,
    categoryFilterId || undefined,
    memberId || undefined,
    PAGE_SIZE,
    offset,
  );

  const transfers = transfersList?.transfers ?? [];
  const totalCount = transfersList?.pagination.total ?? 0;
  const pageTotal = transfers.reduce((s, t) => s + t.amount, 0);

  const memberOpts = [
    { value: "", label: "All members" },
    ...(summary?.members ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];
  const catOpts = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ];

  const memberColorIndex = new Map(
    (summary?.members ?? []).map((m, i) => [m.id, i]),
  );

  const activeFilterCount = [memberId, categoryFilterId].filter(Boolean).length;

  const clearFilters = () => {
    setMemberId("");
    setCategoryFilterId("");
    setOffset(0);
  };

  const handleMemberChange = (value: string) => {
    setMemberId(value);
    setOffset(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilterId(value);
    setOffset(0);
  };

  const handleDeleteTransfer = async (id: string) => {
    try {
      await transferApi.delete(id);
      refreshTransfers();
      refreshSummary();
      setTransferToDelete(null);
    } catch (err) {
      console.error("Failed to delete transfer", err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Budget Transfers
            </h1>
            <p className="text-slate-500">
              History of transfers for {summary?.groupName}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setShowFilters((prev) => !prev);
          }}
        >
          <SlidersHorizontal size={16} className="mr-1.5" />
          {showFilters ? "Hide Filters" : "Filters"}
          {activeFilterCount > 0 && ` (${activeFilterCount.toString()})`}
        </Button>
      </header>

      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                Member
              </span>
              <Select
                value={memberId}
                onValueChange={handleMemberChange}
                options={memberOpts}
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                Category
              </span>
              <Select
                value={categoryFilterId}
                onValueChange={handleCategoryChange}
                options={catOpts}
              />
            </div>
            {activeFilterCount > 0 && (
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={13} className="mr-1" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between text-sm pb-2 mb-2">
          <span className="text-slate-500">
            Showing{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {transfers.length.toString()}
            </strong>{" "}
            of {totalCount.toString()} transfers
          </span>
          <span className="text-slate-500">
            Total{" "}
            <strong className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(pageTotal)}
            </strong>
          </span>
        </div>

        {isMobile && transfers.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <Info size={13} /> Tap any transfer to delete it.
          </p>
        )}

        <div
          className={
            isMobile
              ? "-mx-6 border-t border-slate-100 dark:border-slate-800"
              : "rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          }
        >
          {!isMobile && (
            <div className="grid grid-cols-[2.2fr_2fr_1fr_64px] gap-4 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Transfer
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Members
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">
                Amount
              </span>
              <span />
            </div>
          )}

          {loading || transfersList === null ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-balance" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No transfers match these filters.
            </div>
          ) : (
            transfers.map((transfer) => {
              const fromColorIndex = memberColorIndex.get(
                transfer.fromMemberId,
              );
              const toColorIndex = memberColorIndex.get(transfer.toMemberId);

              const rowClick = isMobile
                ? () => {
                    setTransferToDelete(transfer.id);
                  }
                : undefined;
              const rowKeyDown = isMobile
                ? (e: React.KeyboardEvent) => {
                    if (e.key === "Enter") {
                      setTransferToDelete(transfer.id);
                    }
                  }
                : undefined;

              if (isMobile) {
                return (
                  <div
                    key={transfer.id}
                    onClick={rowClick}
                    onKeyDown={rowKeyDown}
                    tabIndex={0}
                    role="button"
                    className="px-6 py-3.5 select-none outline-none cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-transfer"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIconTile
                        icon={transfer.categoryIcon}
                        size="2xs"
                        className="bg-brand-transfer/10 text-brand-transfer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {transfer.categoryName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 min-w-0">
                          <Avatar
                            name={transfer.fromMemberName}
                            colorIndex={fromColorIndex}
                            size="xs"
                          />
                          <span className="truncate">
                            {transfer.fromMemberName.split(" ")[0]}
                          </span>
                          <span>→</span>
                          <Avatar
                            name={transfer.toMemberName}
                            colorIndex={toColorIndex}
                            size="xs"
                          />
                          <span className="truncate">
                            {transfer.toMemberName.split(" ")[0]}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                        {formatCurrency(transfer.amount)}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={transfer.id}
                  className="grid grid-cols-[2.2fr_2fr_1fr_64px] items-center px-5 py-3 gap-4 select-none outline-none border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIconTile
                      icon={transfer.categoryIcon}
                      className="bg-brand-transfer/10 text-brand-transfer"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {transfer.categoryName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 min-w-0 text-sm text-slate-600 dark:text-slate-300">
                    <Avatar
                      name={transfer.fromMemberName}
                      colorIndex={fromColorIndex}
                      size="xs"
                    />
                    <span className="truncate">
                      {transfer.fromMemberName.split(" ")[0]}
                    </span>
                    <span className="text-slate-400">→</span>
                    <Avatar
                      name={transfer.toMemberName}
                      colorIndex={toColorIndex}
                      size="xs"
                    />
                    <span className="truncate">
                      {transfer.toMemberName.split(" ")[0]}
                    </span>
                  </div>

                  <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                    {formatCurrency(transfer.amount)}
                  </div>

                  <div className="flex justify-end">
                    <RowMenu
                      onDelete={() => {
                        setTransferToDelete(transfer.id);
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
            <span>
              {(offset + 1).toString()}–
              {Math.min(offset + PAGE_SIZE, totalCount).toString()} of{" "}
              {totalCount.toString()}
            </span>
            <div className="flex items-center gap-2">
              <IconButton
                bordered
                hover="balance"
                size="sm"
                disabled={offset === 0}
                onClick={() => {
                  setOffset(Math.max(0, offset - PAGE_SIZE));
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </IconButton>
              <IconButton
                bordered
                hover="balance"
                size="sm"
                disabled={offset + PAGE_SIZE >= totalCount}
                onClick={() => {
                  setOffset(offset + PAGE_SIZE);
                }}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </IconButton>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={transferToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTransferToDelete(null);
        }}
        title="Delete Transfer"
        description="Are you sure you want to delete this transfer? This action cannot be undone."
      >
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTransferToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="transfer"
            onClick={() => {
              if (transferToDelete) void handleDeleteTransfer(transferToDelete);
            }}
          >
            Delete Transfer
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
