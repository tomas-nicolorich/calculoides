import { Filter } from 'lucide-react';
import { useState } from 'react';

interface ExpenseFilterProps {
  onFilterChange: (filters: { memberId?: string; categoryId?: string }) => void;
  members: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export function ExpenseFilter({ onFilterChange, members, categories }: ExpenseFilterProps) {
  const [localFilters, setLocalFilters] = useState<{ memberId?: string; categoryId?: string }>({});

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
      
      <select 
        value={localFilters.memberId ?? ''}
        onChange={(e) => { handleMemberChange(e.target.value); }}
        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-brand-balance outline-none transition-all"
      >
        <option value="">All Members</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <select 
        value={localFilters.categoryId ?? ''}
        onChange={(e) => { handleCategoryChange(e.target.value); }}
        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-brand-balance outline-none transition-all"
      >
        <option value="">All Categories</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}
