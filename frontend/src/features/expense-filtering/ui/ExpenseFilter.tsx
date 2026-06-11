import { Filter } from "lucide-react";
import { useState } from "react";
import { Select } from "../../../shared/ui";

interface ExpenseFilterProps {
  onFilterChange: (filters: { memberId?: string; categoryId?: string }) => void;
  members: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export function ExpenseFilter({
  onFilterChange,
  members,
  categories,
}: ExpenseFilterProps) {
  const [localFilters, setLocalFilters] = useState<{
    memberId?: string;
    categoryId?: string;
  }>({});

  const handleMemberChange = (id: string) => {
    const next = { ...localFilters, memberId: id || undefined };
    setLocalFilters(next);
    onFilterChange(next);
  };

  const handleCategoryChange = (id: string) => {
    const next = { ...localFilters, categoryId: id || undefined };
    setLocalFilters(next);
    onFilterChange(next);
  };

  return (
    <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 text-slate-500">
        <Filter size={18} />
        <span className="text-sm font-medium">Filter by:</span>
      </div>

      <Select
        value={localFilters.memberId ?? ""}
        onValueChange={handleMemberChange}
        options={[
          { value: "", label: "All Members" },
          ...members.map((m) => ({ value: m.id, label: m.name })),
        ]}
        className="min-w-[160px] border-none"
      />

      <Select
        value={localFilters.categoryId ?? ""}
        onValueChange={handleCategoryChange}
        options={[
          { value: "", label: "All Categories" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        className="min-w-[160px] border-none"
      />
    </div>
  );
}
