import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  IconButton,
  RowMenu,
  Select,
  Skeleton,
} from "../../../shared/ui";
import { DialogFooter } from "../../../shared/ui/Dialog";
import { ResponsiveDialog } from "../../../shared/ui/ResponsiveDialog";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { CategoryIconTile } from "../../../shared/lib/categoryIcons";
import { useIsMobile } from "../../../shared/lib/hooks/useIsMobile";
import { Avatar } from "../../../shared/ui/Avatar";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  useTransfersList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { useParams } from "react-router-dom";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { transferApi } from "../../../entities/transfer";
import { queryKeys } from "../../../shared/api/queryKeys";
import { toErrorMessage } from "../../../shared/api/toErrorMessage";

const PAGE_SIZE = 25;

type TransferRow = NonNullable<
  ReturnType<typeof useTransfersList>["data"]
>["transfers"][number];

function formatTransferDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// fallow-ignore-next-line complexity
export function TransfersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const isMobile = useIsMobile();
  const [memberId, setMemberId] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [viewingTransfer, setViewingTransfer] = useState<TransferRow | null>(
    null,
  );
  const [transferToDelete, setTransferToDelete] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const qc = useQueryClient();
  const invalidateGroup = () =>
    qc.invalidateQueries({ queryKey: queryKeys.group(groupId ?? "") });

  const deleteTransfer = useMutation({
    mutationFn: (id: string) => transferApi.delete(id),
    onSuccess: invalidateGroup,
  });
  const deleteAllTransfers = useMutation({
    mutationFn: (groupId: string) => transferApi.deleteAll(groupId),
    onSuccess: invalidateGroup,
  });
  const deleteError = toErrorMessage(
    deleteTransfer.error ?? deleteAllTransfers.error,
  );

  const { data: summary } = useDashboardSummary(groupId ?? null);
  const { data: categories } = useCategoriesList(groupId ?? null);
  const { data: transfersList, loading } = useTransfersList(
    groupId ?? null,
    categoryFilterId || undefined,
    memberId || undefined,
    PAGE_SIZE,
    offset,
  );

  const transfers = transfersList?.transfers ?? [];
  const totalCount = transfersList?.pagination.total ?? 0;

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
      await deleteTransfer.mutateAsync(id);
      setTransferToDelete(null);
    } catch {
      // deleteError derives from deleteTransfer.error above.
    }
  };

  const handleDeleteAllTransfers = async () => {
    if (!groupId) return;
    try {
      await deleteAllTransfers.mutateAsync(groupId);
      setDeleteAllOpen(false);
    } catch {
      // deleteError derives from deleteAllTransfers.error above.
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Budget Transfers
          </h1>
          <p className="text-slate-500">
            History of transfers for {summary?.groupName}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            className="hover:text-brand-expense"
            disabled={transfers.length === 0}
            onClick={() => {
              deleteAllTransfers.reset();
              setDeleteAllOpen(true);
            }}
          >
            <Trash2 size={16} className="mr-1.5" />
            Delete All
          </Button>
        </div>
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
        </div>

        {isMobile && transfers.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <Info size={13} /> Tap a transfer to see its details.
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
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) =>
                isMobile ? (
                  <div
                    key={i}
                    className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="min-w-0 flex-1 flex flex-col gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="grid grid-cols-[2.2fr_2fr_1fr_64px] items-center px-5 py-3 gap-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-3.5 w-14" />
                      <Skeleton className="h-3.5 w-4" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-3.5 w-14" />
                    </div>
                    <Skeleton className="h-4 w-16 justify-self-end" />
                    <div />
                  </div>
                ),
              )}
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
                    setViewingTransfer(transfer);
                  }
                : undefined;
              const rowKeyDown = isMobile
                ? (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewingTransfer(transfer);
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
                        size="md"
                        className="bg-brand-transfer/10 text-brand-transfer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {transfer.categoryName}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-slate-400 mt-0.5">
                          {formatTransferDate(transfer.date)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 min-w-0">
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
                      <div className="font-mono tabular-nums text-xs text-slate-400 mt-0.5">
                        {formatTransferDate(transfer.date)}
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

      <ResponsiveDialog
        open={viewingTransfer !== null}
        onOpenChange={(open) => {
          if (!open) setViewingTransfer(null);
        }}
        title="Transfer Details"
      >
        {viewingTransfer && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CategoryIconTile
                icon={viewingTransfer.categoryIcon}
                className="bg-brand-transfer/10 text-brand-transfer"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {viewingTransfer.categoryName}
                </div>
                <div className="font-mono tabular-nums text-xs text-slate-400 mt-0.5">
                  {formatTransferDate(viewingTransfer.date)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Avatar
                name={viewingTransfer.fromMemberName}
                colorIndex={memberColorIndex.get(viewingTransfer.fromMemberId)}
                size="sm"
              />
              <span>{viewingTransfer.fromMemberName}</span>
              <span className="text-slate-400">→</span>
              <Avatar
                name={viewingTransfer.toMemberName}
                colorIndex={memberColorIndex.get(viewingTransfer.toMemberId)}
                size="sm"
              />
              <span>{viewingTransfer.toMemberName}</span>
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(viewingTransfer.amount)}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setViewingTransfer(null);
            }}
          >
            Close
          </Button>
          <Button
            variant="transfer"
            onClick={() => {
              if (viewingTransfer) {
                deleteTransfer.reset();
                setTransferToDelete(viewingTransfer.id);
                setViewingTransfer(null);
              }
            }}
          >
            <Trash2 size={16} className="mr-1.5" />
            Delete Transfer
          </Button>
        </DialogFooter>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={transferToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransferToDelete(null);
            deleteTransfer.reset();
          }
        }}
        title="Delete Transfer"
        description="Are you sure you want to delete this transfer? This action cannot be undone."
      >
        {deleteError && <Alert>{deleteError}</Alert>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTransferToDelete(null);
              deleteTransfer.reset();
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
      </ResponsiveDialog>

      <ResponsiveDialog
        open={deleteAllOpen}
        onOpenChange={(open) => {
          setDeleteAllOpen(open);
          if (!open) deleteAllTransfers.reset();
        }}
        title="Delete All Transfers"
        description="This will permanently delete every transfer in this group, regardless of any active filters. This action cannot be undone."
      >
        {deleteError && <Alert>{deleteError}</Alert>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDeleteAllOpen(false);
              deleteAllTransfers.reset();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="transfer"
            onClick={() => void handleDeleteAllTransfers()}
          >
            Delete All Transfers
          </Button>
        </DialogFooter>
      </ResponsiveDialog>
    </div>
  );
}
