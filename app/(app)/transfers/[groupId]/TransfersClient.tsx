"use client";

import { useState } from "react";
import { Info, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { TransfersList } from "shared/src/types/redesign";
import {
  useTransfersList,
  useDeleteTransfer,
  useDeleteAllTransfers,
} from "../../../_data/transfers";
import { useDashboardSummary } from "../../../_data/summary";
import { useCategoriesList } from "../../../_data/categories";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CategoryIconTile,
  DialogFooter,
  Pagination,
  ReloadButton,
  ResponsiveDialog,
  RowMenu,
  Select,
} from "../../../_ui";
import type { SelectOption } from "../../../../lib/select-options";
import { toSelectOptions } from "../../../../lib/select-options";
import { formatCurrency } from "../../../../lib/format-currency";
import { queryKeys } from "../../../../lib/query-keys";
import {
  TransfersRowsSkeletonMobile,
  TransfersRowsSkeletonDesktop,
} from "./_skeletons";

const PAGE_SIZE = 25;

type Transfer = TransfersList["transfers"][number];

function formatTransferDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMemberColorIndex(
  memberColorIndex: Map<string, number>,
  memberId: string | undefined,
) {
  return memberId ? memberColorIndex.get(memberId) : undefined;
}

/** First non-null mutation error, resolved to a display message. */
function resolveMutationError(
  ...mutations: { error: unknown }[]
): string | null {
  const source = mutations.map((m) => m.error).find(Boolean);
  return source instanceof Error ? source.message : null;
}

function buildTransfersFilters(
  categoryFilterId: string,
  memberId: string,
  offset: number,
) {
  return {
    categoryId: categoryFilterId || undefined,
    memberId: memberId || undefined,
    limit: PAGE_SIZE,
    offset,
  };
}

function resolveTransfersData(transfersList: TransfersList | undefined) {
  return {
    transfers: transfersList?.transfers ?? [],
    totalCount: transfersList?.pagination.total ?? 0,
  };
}

function buildMemberColorIndex(members: { id: string }[] | undefined) {
  return new Map((members ?? []).map((m, i) => [m.id, i]));
}

/** Wraps a mutation call so the dialog closes on success and the failure is
 * swallowed here — the caller's own mutation `.error` state already surfaces it. */
function createDeleteHandler<Args>(
  mutateAsync: (args: Args) => Promise<unknown>,
  onSuccess: () => void,
) {
  return async (args: Args) => {
    try {
      await mutateAsync(args);
      onSuccess();
    } catch {
      // error surfaces via the mutation's own `.error` state
    }
  };
}

/** Zero-argument counterpart of `createDeleteHandler` (e.g. "delete all"). */
function createDeleteAllHandler(
  mutateAsync: () => Promise<unknown>,
  onSuccess: () => void,
) {
  return async () => {
    try {
      await mutateAsync();
      onSuccess();
    } catch {
      // error surfaces via the mutation's own `.error` state
    }
  };
}

/** Moves the viewed transfer over to the delete-confirmation dialog. */
function createRequestDeleteFromDetailsHandler(
  viewingTransfer: Transfer | null,
  resetDeleteTransfer: () => void,
  setTransferToDelete: (id: string | null) => void,
  setViewingTransfer: (transfer: Transfer | null) => void,
) {
  return () => {
    if (!viewingTransfer) return;
    resetDeleteTransfer();
    setTransferToDelete(viewingTransfer.id);
    setViewingTransfer(null);
  };
}

/** Guards the confirm-delete action against a null `transferToDelete`. */
function createConfirmDeleteHandler(
  transferToDelete: string | null,
  handleDeleteTransfer: (id: string) => Promise<void>,
) {
  return () => {
    if (!transferToDelete) return;
    void handleDeleteTransfer(transferToDelete);
  };
}

/**
 * Full port of `main`'s `frontend/src/pages/transfers/ui/TransfersPage.tsx`
 * (filters, pagination, view-details, delete, delete-all) — replaces the
 * earlier lean stub. Adapted to this repo's data seam: `groupId` comes as a
 * prop (no react-router `useParams`), list/mutation hooks are the hoisted
 * `app/_data/*` ones (`useTransfersList` takes a filters object, mutations
 * resolve `ActionResult` instead of throwing). No add-transfer UI here —
 * `main` doesn't have one on this page either; creation lives in the
 * dashboard's per-member transfer dialog (already ported).
 *
 * DEVIATION (mandatory, ADR-3 —
 * `openspec/changes/archive/2026-08-18-nextjs-migration-ui-fixes/design.md`):
 * `main` picks mobile-vs-desktop markup with a JS `useIsMobile()` branch;
 * that hook is scoped to `ResponsiveDialog`/`DatePicker` only in this repo
 * to avoid an SSR hydration flash. Here both trees render unconditionally,
 * gated by Tailwind `md:hidden` / `hidden md:*`, same pattern as the
 * Expenses page port.
 */
export function TransfersClient({ groupId }: { groupId: string }) {
  const [memberId, setMemberId] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [viewingTransfer, setViewingTransfer] = useState<Transfer | null>(
    null,
  );
  const [transferToDelete, setTransferToDelete] = useState<string | null>(
    null,
  );
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const deleteTransfer = useDeleteTransfer(groupId);
  const deleteAllTransfers = useDeleteAllTransfers(groupId);
  const deleteError = resolveMutationError(deleteTransfer, deleteAllTransfers);

  const { data: summary } = useDashboardSummary(groupId);
  const { data: categories } = useCategoriesList(groupId);
  const { data: transfersList, isLoading: loading } = useTransfersList(
    groupId,
    buildTransfersFilters(categoryFilterId, memberId, offset),
  );

  const { transfers, totalCount } = resolveTransfersData(transfersList);

  const memberOpts = toSelectOptions(summary?.members, "All members");
  const catOpts = toSelectOptions(categories, "All categories");

  const memberColorIndex = buildMemberColorIndex(summary?.members);

  const activeFilterCount = [memberId, categoryFilterId].filter(
    Boolean,
  ).length;

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

  const handleDeleteTransfer = createDeleteHandler(
    (id: string) => deleteTransfer.mutateAsync({ transferId: id }),
    () => {
      setTransferToDelete(null);
    },
  );

  const handleDeleteAllTransfers = createDeleteAllHandler(
    () => deleteAllTransfers.mutateAsync({ groupId }),
    () => {
      setDeleteAllOpen(false);
    },
  );

  const handleRequestDeleteFromDetails = createRequestDeleteFromDetailsHandler(
    viewingTransfer,
    () => {
      deleteTransfer.reset();
    },
    setTransferToDelete,
    setViewingTransfer,
  );

  const handleConfirmDeleteTransfer = createConfirmDeleteHandler(
    transferToDelete,
    handleDeleteTransfer,
  );

  const viewingFromColorIndex = getMemberColorIndex(
    memberColorIndex,
    viewingTransfer?.fromMemberId,
  );
  const viewingToColorIndex = getMemberColorIndex(
    memberColorIndex,
    viewingTransfer?.toMemberId,
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <TransfersToolbar
        groupId={groupId}
        groupName={summary?.groupName}
        showFilters={showFilters}
        activeFilterCount={activeFilterCount}
        disableDeleteAll={transfers.length === 0}
        onToggleFilters={() => {
          setShowFilters((prev) => !prev);
        }}
        onDeleteAllOpen={() => {
          deleteAllTransfers.reset();
          setDeleteAllOpen(true);
        }}
      />

      {showFilters && (
        <TransfersFilterPanel
          memberId={memberId}
          categoryFilterId={categoryFilterId}
          memberOpts={memberOpts}
          catOpts={catOpts}
          activeFilterCount={activeFilterCount}
          onMemberChange={handleMemberChange}
          onCategoryChange={handleCategoryChange}
          onClearFilters={clearFilters}
        />
      )}

      <TransferListCard
        transfers={transfers}
        totalCount={totalCount}
        loading={loading}
        transfersList={transfersList}
        memberColorIndex={memberColorIndex}
        onSelectTransfer={setViewingTransfer}
        onDeleteTransfer={setTransferToDelete}
        offset={offset}
        onOffsetChange={setOffset}
      />

      <TransferDetailsDialog
        transfer={viewingTransfer}
        fromColorIndex={viewingFromColorIndex}
        toColorIndex={viewingToColorIndex}
        onClose={() => {
          setViewingTransfer(null);
        }}
        onRequestDelete={handleRequestDeleteFromDetails}
      />

      <DeleteTransferDialog
        open={transferToDelete !== null}
        deleteError={deleteError}
        onCancel={() => {
          setTransferToDelete(null);
          deleteTransfer.reset();
        }}
        onConfirmDelete={handleConfirmDeleteTransfer}
      />

      <DeleteAllTransfersDialog
        open={deleteAllOpen}
        deleteError={deleteError}
        onCancel={() => {
          setDeleteAllOpen(false);
          deleteAllTransfers.reset();
        }}
        onConfirmDelete={() => void handleDeleteAllTransfers()}
      />
    </div>
  );
}

/** The transfers list card: count line, "tap to see details" hint, the mobile
 * and desktop row trees (ADR-3), and pagination. */
function TransferListCard({
  transfers,
  totalCount,
  loading,
  transfersList,
  memberColorIndex,
  onSelectTransfer,
  onDeleteTransfer,
  offset,
  onOffsetChange,
}: {
  transfers: Transfer[];
  totalCount: number;
  loading: boolean;
  transfersList: TransfersList | undefined;
  memberColorIndex: Map<string, number>;
  onSelectTransfer: (transfer: Transfer) => void;
  onDeleteTransfer: (transferId: string) => void;
  offset: number;
  onOffsetChange: (offset: number) => void;
}) {
  return (
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

      {transfers.length > 0 && (
        <p className="md:hidden flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Info size={13} /> Tap a transfer to see its details.
        </p>
      )}

      <div className="md:hidden -mx-6 border-t border-slate-100 dark:border-slate-800">
        <TransferRowsMobile
          loading={loading}
          transfersList={transfersList}
          transfers={transfers}
          memberColorIndex={memberColorIndex}
          onSelect={onSelectTransfer}
        />
      </div>

      <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="hidden md:grid grid-cols-[2.2fr_2fr_1fr_64px] gap-4 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
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

        <TransferRowsDesktop
          loading={loading}
          transfersList={transfersList}
          transfers={transfers}
          memberColorIndex={memberColorIndex}
          onDelete={onDeleteTransfer}
        />
      </div>

      <Pagination
        offset={offset}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onOffsetChange={onOffsetChange}
      />
    </Card>
  );
}

/** Mobile row list body: skeleton while loading, empty state, or the row list. */
function TransferRowsMobile({
  loading,
  transfersList,
  transfers,
  memberColorIndex,
  onSelect,
}: {
  loading: boolean;
  transfersList: TransfersList | undefined;
  transfers: Transfer[];
  memberColorIndex: Map<string, number>;
  onSelect: (transfer: Transfer) => void;
}) {
  if (loading || transfersList === undefined) return <TransfersRowsSkeletonMobile />;
  if (transfers.length === 0) return <EmptyTransfers />;

  return (
    <>
      {transfers.map((transfer) => (
        <TransferRowMobile
          key={transfer.id}
          transfer={transfer}
          fromColorIndex={memberColorIndex.get(transfer.fromMemberId)}
          toColorIndex={memberColorIndex.get(transfer.toMemberId)}
          onSelect={() => {
            onSelect(transfer);
          }}
        />
      ))}
    </>
  );
}

/** Desktop row list body: skeleton while loading, empty state, or the row list. */
function TransferRowsDesktop({
  loading,
  transfersList,
  transfers,
  memberColorIndex,
  onDelete,
}: {
  loading: boolean;
  transfersList: TransfersList | undefined;
  transfers: Transfer[];
  memberColorIndex: Map<string, number>;
  onDelete: (transferId: string) => void;
}) {
  if (loading || transfersList === undefined) return <TransfersRowsSkeletonDesktop />;
  if (transfers.length === 0) return <EmptyTransfers />;

  return (
    <>
      {transfers.map((transfer) => (
        <TransferRowDesktop
          key={transfer.id}
          transfer={transfer}
          fromColorIndex={memberColorIndex.get(transfer.fromMemberId)}
          toColorIndex={memberColorIndex.get(transfer.toMemberId)}
          onDelete={() => {
            onDelete(transfer.id);
          }}
        />
      ))}
    </>
  );
}

function TransfersToolbar({
  groupId,
  groupName,
  showFilters,
  activeFilterCount,
  disableDeleteAll,
  onToggleFilters,
  onDeleteAllOpen,
}: {
  groupId: string;
  groupName: string | undefined;
  showFilters: boolean;
  activeFilterCount: number;
  disableDeleteAll: boolean;
  onToggleFilters: () => void;
  onDeleteAllOpen: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Budget Transfers
        </h1>
        <p className="text-slate-500">History of transfers for {groupName}</p>
      </div>
      <div className="flex items-center gap-2">
        <ReloadButton queryKey={queryKeys.group(groupId)} />
        <Button variant="outline" onClick={onToggleFilters}>
          <SlidersHorizontal size={16} className="mr-1.5" />
          {showFilters ? "Hide Filters" : "Filters"}
          {activeFilterCount > 0 && ` (${activeFilterCount.toString()})`}
        </Button>
        <Button
          variant="ghost"
          className="hover:text-brand-expense"
          disabled={disableDeleteAll}
          onClick={onDeleteAllOpen}
        >
          <Trash2 size={16} className="mr-1.5" />
          Delete All
        </Button>
      </div>
    </header>
  );
}

/** The filters card (member/category + clear), shown when `showFilters` is toggled on. */
function TransfersFilterPanel({
  memberId,
  categoryFilterId,
  memberOpts,
  catOpts,
  activeFilterCount,
  onMemberChange,
  onCategoryChange,
  onClearFilters,
}: {
  memberId: string;
  categoryFilterId: string;
  memberOpts: SelectOption[];
  catOpts: SelectOption[];
  activeFilterCount: number;
  onMemberChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-1.5">
            Member
          </span>
          <Select
            value={memberId}
            onValueChange={onMemberChange}
            options={memberOpts}
          />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-1.5">
            Category
          </span>
          <Select
            value={categoryFilterId}
            onValueChange={onCategoryChange}
            options={catOpts}
          />
        </div>
        {activeFilterCount > 0 && (
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X size={13} className="mr-1" /> Clear filters
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Shared from→to avatar-pair markup, used by both row variants and the
 * details dialog with slightly different sizing/typography — the single
 * highest-leverage extraction in this file (was repeated 3 times verbatim). */
function MemberPair({
  fromName,
  fromColorIndex,
  toName,
  toColorIndex,
  avatarSize,
  wrapperClassName,
  nameClassName,
  arrowClassName,
  truncateNames,
}: {
  fromName: string;
  fromColorIndex: number | undefined;
  toName: string;
  toColorIndex: number | undefined;
  avatarSize: "xs" | "sm";
  wrapperClassName: string;
  nameClassName?: string;
  arrowClassName?: string;
  truncateNames?: boolean;
}) {
  const displayName = (name: string) =>
    truncateNames ? name.split(" ")[0] : name;

  return (
    <div className={wrapperClassName}>
      <Avatar name={fromName} colorIndex={fromColorIndex} size={avatarSize} />
      <span className={nameClassName}>{displayName(fromName)}</span>
      <span className={arrowClassName}>→</span>
      <Avatar name={toName} colorIndex={toColorIndex} size={avatarSize} />
      <span className={nameClassName}>{displayName(toName)}</span>
    </div>
  );
}

/** Mobile transfer row: the whole row is a click/Enter target that opens the
 * details dialog (no per-row menu on mobile, matching the original inline markup). */
function TransferRowMobile({
  transfer,
  fromColorIndex,
  toColorIndex,
  onSelect,
}: {
  transfer: Transfer;
  fromColorIndex: number | undefined;
  toColorIndex: number | undefined;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
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
          <MemberPair
            fromName={transfer.fromMemberName}
            fromColorIndex={fromColorIndex}
            toName={transfer.toMemberName}
            toColorIndex={toColorIndex}
            avatarSize="xs"
            wrapperClassName="flex items-center gap-1.5 text-xs text-slate-400 mt-1 min-w-0"
            nameClassName="truncate"
            truncateNames
          />
        </div>
        <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
          {formatCurrency(transfer.amount)}
        </div>
      </div>
    </div>
  );
}

/** Desktop transfer row: grid layout with a trailing `RowMenu` for delete. */
function TransferRowDesktop({
  transfer,
  fromColorIndex,
  toColorIndex,
  onDelete,
}: {
  transfer: Transfer;
  fromColorIndex: number | undefined;
  toColorIndex: number | undefined;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-[2.2fr_2fr_1fr_64px] items-center px-5 py-3 gap-4 select-none outline-none border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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

      <MemberPair
        fromName={transfer.fromMemberName}
        fromColorIndex={fromColorIndex}
        toName={transfer.toMemberName}
        toColorIndex={toColorIndex}
        avatarSize="xs"
        wrapperClassName="flex items-center gap-2 min-w-0 text-sm text-slate-600 dark:text-slate-300"
        nameClassName="truncate"
        arrowClassName="text-slate-400"
        truncateNames
      />

      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
        {formatCurrency(transfer.amount)}
      </div>

      <div className="flex justify-end">
        <RowMenu onDelete={onDelete} />
      </div>
    </div>
  );
}

/** "Transfer Details" `ResponsiveDialog` opened from either row tree, with
 * Close/Delete actions. Renders nothing (dialog closed) when `transfer` is null. */
function TransferDetailsDialog({
  transfer,
  fromColorIndex,
  toColorIndex,
  onClose,
  onRequestDelete,
}: {
  transfer: Transfer | null;
  fromColorIndex: number | undefined;
  toColorIndex: number | undefined;
  onClose: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <ResponsiveDialog
      open={transfer !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Transfer Details"
    >
      {transfer && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
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
          <MemberPair
            fromName={transfer.fromMemberName}
            fromColorIndex={fromColorIndex}
            toName={transfer.toMemberName}
            toColorIndex={toColorIndex}
            avatarSize="sm"
            wrapperClassName="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
            arrowClassName="text-slate-400"
          />
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(transfer.amount)}
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="transfer" onClick={onRequestDelete}>
          <Trash2 size={16} className="mr-1.5" />
          Delete Transfer
        </Button>
      </DialogFooter>
    </ResponsiveDialog>
  );
}

/** The single-transfer delete-confirmation `ResponsiveDialog` body. */
function DeleteTransferDialog({
  open,
  deleteError,
  onCancel,
  onConfirmDelete,
}: {
  open: boolean;
  deleteError: string | null;
  onCancel: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      title="Delete Transfer"
      description="Are you sure you want to delete this transfer? This action cannot be undone."
    >
      {deleteError && <Alert>{deleteError}</Alert>}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="transfer" onClick={onConfirmDelete}>
          Delete Transfer
        </Button>
      </DialogFooter>
    </ResponsiveDialog>
  );
}

/** The delete-all `ResponsiveDialog` body. */
function DeleteAllTransfersDialog({
  open,
  deleteError,
  onCancel,
  onConfirmDelete,
}: {
  open: boolean;
  deleteError: string | null;
  onCancel: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      title="Delete All Transfers"
      description="This will permanently delete every transfer in this group, regardless of any active filters. This action cannot be undone."
    >
      {deleteError && <Alert>{deleteError}</Alert>}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="transfer" onClick={onConfirmDelete}>
          Delete All Transfers
        </Button>
      </DialogFooter>
    </ResponsiveDialog>
  );
}

/** Extracted so both the mobile and desktop trees (ADR-3) share the same empty-state markup. */
function EmptyTransfers() {
  return (
    <div className="py-12 text-center text-sm text-slate-400">
      No transfers match these filters.
    </div>
  );
}
