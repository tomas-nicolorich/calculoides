import { Filter } from "lucide-react";
import { useState } from "react";
import { FilterPanel, Select } from "../../../shared/ui";

interface ExpenseFilterProps {
  onFilterChange: (filters: {
    memberId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  }) => void;
  members: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

// fallow-ignore-next-line complexity
export function ExpenseFilter({
  onFilterChange,
  members,
  categories,
}: ExpenseFilterProps) {
  const [localFilters, setLocalFilters] = useState<{
    memberId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  }>({});

  const update = (patch: typeof localFilters) => {
    const next = { ...localFilters, ...patch };
    setLocalFilters(next);
    onFilterChange(next);
  };

  const activeCount = [localFilters.from, localFilters.to].filter(
    Boolean,
  ).length;

  const handleClear = () => {
    const next = { ...localFilters, from: undefined, to: undefined };
    setLocalFilters(next);
    onFilterChange(next);
  };

  return (
    <FilterPanel activeCount={activeCount} onClear={handleClear}>
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={18} />
          <span className="text-sm font-medium">Filter by:</span>
        </div>

        <Select
          value={localFilters.memberId ?? ""}
          onValueChange={(id) => {
            update({ memberId: id || undefined });
          }}
          options={[
            { value: "", label: "All Members" },
            ...members.map((m) => ({ value: m.id, label: m.name })),
          ]}
          className="min-w-[160px] border-none"
        />

        <Select
          value={localFilters.categoryId ?? ""}
          onValueChange={(id) => {
            update({ categoryId: id || undefined });
          }}
          options={[
            { value: "", label: "All Categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          className="min-w-[160px] border-none"
        />

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">From</label>
          <input
            type="date"
            value={localFilters.from ?? ""}
            onChange={(e) => {
              update({ from: e.target.value || undefined });
            }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">To</label>
          <input
            type="date"
            value={localFilters.to ?? ""}
            onChange={(e) => {
              update({ to: e.target.value || undefined });
            }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>
    </FilterPanel>
  );
}
