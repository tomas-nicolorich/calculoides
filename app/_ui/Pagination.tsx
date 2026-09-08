import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./IconButton";

export interface PaginationProps {
  /** Current page's starting index into the full result set. */
  offset: number;
  /** Number of rows per page. */
  pageSize: number;
  /** Total number of rows across all pages. */
  totalCount: number;
  onOffsetChange: (offset: number) => void;
}

/**
 * Shared "N–M of total" footer with prev/next `IconButton`s, byte-identical
 * across `ExpensesClient` and `TransfersClient` before extraction. Renders
 * nothing when everything fits on one page (`totalCount <= pageSize`), same
 * as the inline `{totalCount > PAGE_SIZE && (...)}` guard both call sites had.
 */
export function Pagination({
  offset,
  pageSize,
  totalCount,
  onOffsetChange,
}: PaginationProps) {
  if (totalCount <= pageSize) return null;

  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
      <span>
        {(offset + 1).toString()}–
        {Math.min(offset + pageSize, totalCount).toString()} of{" "}
        {totalCount.toString()}
      </span>
      <div className="flex items-center gap-2">
        <IconButton
          bordered
          hover="balance"
          size="sm"
          disabled={offset === 0}
          onClick={() => {
            onOffsetChange(Math.max(0, offset - pageSize));
          }}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </IconButton>
        <IconButton
          bordered
          hover="balance"
          size="sm"
          disabled={offset + pageSize >= totalCount}
          onClick={() => {
            onOffsetChange(offset + pageSize);
          }}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </IconButton>
      </div>
    </div>
  );
}
