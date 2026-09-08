"use client";

import { useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useIsMobile } from "../../lib/hooks/use-is-mobile";

type DatePickerGranularity = "day" | "month";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** "day" -> YYYY-MM-DD, disables future dates. "month" -> YYYY-MM, disables past months. */
  granularity?: DatePickerGranularity;
  placeholder?: string;
  disabled?: boolean;
  /** Forwarded to the trigger button so a `<label htmlFor>` can target it. */
  id?: string;
  /**
   * id of an external `<label>`. Combined with the trigger's own display
   * node via aria-labelledby so the accessible name is "<label> <selected
   * date>" instead of the label text alone overriding the selection.
   */
  labelId?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parseDayValue(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDayValue(date: Date): string {
  return `${date.getFullYear().toString()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseMonthValue(value: string): Date | null {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1);
}

function formatMonthValue(date: Date): string {
  return `${date.getFullYear().toString()}-${pad(date.getMonth() + 1)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatDisplayLabel(
  selected: Date | null,
  granularity: DatePickerGranularity,
  placeholder: string | undefined,
): string {
  if (!selected) {
    return (
      placeholder ?? (granularity === "day" ? "Select date" : "Select month")
    );
  }
  return granularity === "day"
    ? selected.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : selected.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** Full accessible date label for a day gridcell, e.g. "Friday, 15 March 2024". */
function dayCellLabel(day: Date): string {
  return day.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Full accessible label for a month gridcell, e.g. "Apr 2024". */
function monthCellLabel(monthLabel: string, year: number): string {
  return `${monthLabel} ${year.toString()}`;
}

function buildDayGrid(viewDate: Date): Date[][] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7; // Monday-start week
  const start = new Date(year, month, 1 - offset);
  const days = Array.from(
    { length: 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
  return Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
}

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-GB", { month: "short" }),
);

const triggerClassName =
  "flex h-9 w-full items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-left text-sm shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus-visible:outline-none focus-visible:border-brand-balance focus-visible:ring-1 focus-visible:ring-brand-balance disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

/**
 * Picker-only date field (no typing), matching Select/RowMenu's Base UI
 * Popover pattern. Anchored popover on desktop; a bottom sheet on mobile so
 * the calendar stays full-width and thumb-reachable instead of a cramped
 * floating popup near the top of a form.
 *
 * Ported from `main`'s `shared/ui/DatePicker.tsx`. DEVIATION (documented,
 * tasks.md 7.1/7.6): `main` sources `isDesktop` from its own
 * `useMediaQuery("(min-width: 768px)")` hook, not present in this repo —
 * this port uses `useIsMobile()` (PR 2, same substitution PR 6 made for
 * `ResponsiveDialog`) and derives `isDesktop = !useIsMobile()`. `main` has
 * no configurable `min`/`max` props (bounds are implicit via `granularity`)
 * and no keyboard arrow-key grid navigation — both ported verbatim
 * (absent), not added, to stay a faithful port within the design's 477-line
 * `src` budget. `role="grid"`/date-cell labeling and initial-focus-on-open
 * ARE added (task 7.3/7.4 a11y gap-closing), using Base UI's own
 * `initialFocus` popup prop rather than a manual effect.
 */
export function DatePicker({
  value,
  onChange,
  granularity = "day",
  placeholder,
  disabled,
  id,
  labelId,
}: DatePickerProps) {
  const isDesktop = !useIsMobile();
  const valueId = id ? `${id}-value` : undefined;
  const ariaLabelledBy =
    labelId && valueId ? `${labelId} ${valueId}` : undefined;
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const selected =
    granularity === "day" ? parseDayValue(value) : parseMonthValue(value);
  const [viewDate, setViewDate] = useState(() => selected ?? today);

  const resetViewOnOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setViewDate(selected ?? today);
    }
    setOpen(nextOpen);
  };

  const displayLabel = formatDisplayLabel(selected, granularity, placeholder);

  const commit = (date: Date) => {
    onChange(
      granularity === "day" ? formatDayValue(date) : formatMonthValue(date),
    );
    setOpen(false);
  };

  /** Base UI `initialFocus`: focuses the selected (or today's) cell, falling back to default behavior. */
  const focusSelectedCell = () =>
    bodyRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ??
    true;

  const body =
    granularity === "day" ? (
      <DayGrid
        viewDate={viewDate}
        selected={selected}
        today={today}
        onNavigate={setViewDate}
        onSelect={commit}
      />
    ) : (
      <MonthGrid
        viewDate={viewDate}
        selected={selected}
        today={today}
        onNavigate={setViewDate}
        onSelect={commit}
      />
    );

  const triggerContent = (
    <>
      <Calendar size={16} className="shrink-0 text-slate-400" />
      <span
        id={valueId}
        className={cn(
          "flex-1 truncate font-mono tnum",
          selected
            ? "text-slate-900 dark:text-slate-100"
            : "text-slate-400 dark:text-slate-500",
        )}
      >
        {displayLabel}
      </span>
    </>
  );

  if (isDesktop) {
    return (
      <Popover.Root open={open} onOpenChange={resetViewOnOpen}>
        <Popover.Trigger
          id={id}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          className={triggerClassName}
        >
          {triggerContent}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            positionMethod="fixed"
            className="z-50 max-w-[var(--available-width)]"
            sideOffset={4}
            collisionPadding={16}
          >
            <Popover.Popup
              initialFocus={focusSelectedCell}
              className="w-80 max-w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 transition-[transform,opacity] duration-150 ease-out data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95"
            >
              <div ref={bodyRef}>{body}</div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <BaseDialog.Root open={open} onOpenChange={resetViewOnOpen}>
      <BaseDialog.Trigger
        id={id}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        className={triggerClassName}
      >
        {triggerContent}
      </BaseDialog.Trigger>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          onClick={() => {
            setOpen(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0"
        />
        <BaseDialog.Popup
          initialFocus={focusSelectedCell}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pb-6 shadow-xl transition-transform duration-200 ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          <BaseDialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-balance"
          >
            <X size={18} />
          </BaseDialog.Close>
          <div ref={bodyRef} className="mt-6">
            {body}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

interface GridProps {
  viewDate: Date;
  selected: Date | null;
  today: Date;
  onNavigate: (date: Date) => void;
  onSelect: (date: Date) => void;
}

interface DayCellState {
  inMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

function getDayCellState(
  day: Date,
  viewDate: Date,
  todayMidnight: Date,
  selected: Date | null,
): DayCellState {
  const inMonth = isSameMonth(day, viewDate);
  const isFuture = day > todayMidnight;
  const isToday = isSameDay(day, todayMidnight);
  const isSelected = selected ? isSameDay(day, selected) : false;
  return {
    inMonth,
    isFuture,
    isToday,
    isSelected,
    isDisabled: !inMonth || isFuture,
  };
}

function dayCellClassName({
  inMonth,
  isFuture,
  isSelected,
}: DayCellState): string {
  return cn(
    "relative grid h-9 w-9 place-items-center rounded-lg font-mono tnum text-sm transition-colors",
    !inMonth && "invisible",
    inMonth &&
      !isFuture &&
      !isSelected &&
      "cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    isFuture &&
      inMonth &&
      "cursor-not-allowed text-slate-300 dark:text-slate-700",
    isSelected && "bg-brand-balance font-semibold text-white",
  );
}

function DayGrid({
  viewDate,
  selected,
  today,
  onNavigate,
  onSelect,
}: GridProps) {
  const weeks = buildDayGrid(viewDate);
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const autofocusTarget = selected ?? todayMidnight;
  const monthYearLabel = viewDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => {
            onNavigate(
              new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
            );
          }}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-mono tnum text-sm font-semibold text-slate-700 dark:text-slate-200">
          {monthYearLabel}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => {
            onNavigate(
              new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
            );
          }}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pb-1">
        {WEEKDAY_LABELS.map((d) => (
          <span
            key={d}
            className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500"
          >
            {d}
          </span>
        ))}
      </div>

      <div
        role="grid"
        aria-label={`${monthYearLabel} calendar`}
        className="grid grid-cols-7 gap-1 px-1"
      >
        {weeks.map((week) => (
          <div role="row" className="contents" key={formatDayValue(week[0])}>
            {week.map((day) => {
              const state = getDayCellState(
                day,
                viewDate,
                todayMidnight,
                selected,
              );
              const isAutofocusTarget =
                isSameDay(day, autofocusTarget) && !state.isDisabled;

              return (
                <button
                  key={`${formatMonthValue(viewDate)}-${formatDayValue(day)}`}
                  type="button"
                  role="gridcell"
                  aria-label={dayCellLabel(day)}
                  aria-selected={state.isSelected}
                  data-autofocus={isAutofocusTarget ? "true" : undefined}
                  disabled={state.isDisabled}
                  onClick={() => {
                    onSelect(day);
                  }}
                  className={dayCellClassName(state)}
                >
                  {day.getDate()}
                  {state.isToday && !state.isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-balance" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MonthCellState {
  isPast: boolean;
  isSelected: boolean;
  isCurrent: boolean;
}

function getMonthCellState(
  cellDate: Date,
  year: number,
  monthIndex: number,
  today: Date,
  selected: Date | null,
): MonthCellState {
  const isPast =
    year < today.getFullYear() ||
    (year === today.getFullYear() && monthIndex < today.getMonth());
  return {
    isPast,
    isSelected: selected ? isSameMonth(cellDate, selected) : false,
    isCurrent: isSameMonth(cellDate, today),
  };
}

function monthCellClassName({ isPast, isSelected }: MonthCellState): string {
  return cn(
    "relative rounded-lg py-2.5 font-mono tnum text-sm transition-colors",
    !isPast &&
      !isSelected &&
      "cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    isPast && "cursor-not-allowed text-slate-300 dark:text-slate-700",
    isSelected && "bg-brand-balance font-semibold text-white",
  );
}

function monthRows(): { label: string; index: number }[][] {
  const cells = MONTH_LABELS.map((label, index) => ({ label, index }));
  return Array.from({ length: 4 }, (_, r) => cells.slice(r * 3, r * 3 + 3));
}

function MonthGrid({
  viewDate,
  selected,
  today,
  onNavigate,
  onSelect,
}: GridProps) {
  const year = viewDate.getFullYear();
  const autofocusMonth = selected ?? today;

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          aria-label="Previous year"
          onClick={() => {
            onNavigate(new Date(year - 1, viewDate.getMonth(), 1));
          }}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-mono tnum text-sm font-semibold text-slate-700 dark:text-slate-200">
          {year}
        </span>
        <button
          type="button"
          aria-label="Next year"
          onClick={() => {
            onNavigate(new Date(year + 1, viewDate.getMonth(), 1));
          }}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        role="grid"
        aria-label={`${year.toString()} calendar`}
        className="grid grid-cols-3 gap-1.5 px-1"
      >
        {monthRows().map((row) => (
          <div role="row" className="contents" key={row[0]?.label}>
            {row.map(({ label: monthLabel, index: i }) => {
              const cellDate = new Date(year, i, 1);
              const state = getMonthCellState(
                cellDate,
                year,
                i,
                today,
                selected,
              );
              const isAutofocusTarget =
                isSameMonth(cellDate, autofocusMonth) && !state.isPast;

              return (
                <button
                  key={`${year.toString()}-${monthLabel}`}
                  type="button"
                  role="gridcell"
                  aria-label={monthCellLabel(monthLabel, year)}
                  aria-selected={state.isSelected}
                  data-autofocus={isAutofocusTarget ? "true" : undefined}
                  disabled={state.isPast}
                  onClick={() => {
                    onSelect(cellDate);
                  }}
                  className={monthCellClassName(state)}
                >
                  {monthLabel}
                  {state.isCurrent && !state.isSelected && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-balance" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
