import { Search, SlidersHorizontal } from 'lucide-react';

export interface FilterState {
  search: string;
  category: string;
  status: string;
  promo: string;
  sortBy: string;
}

interface Props {
  filters: FilterState;
  categories: string[];
  onChange: (f: FilterState) => void;
}

const STATUS_OPTIONS = ['', 'CRITICAL', 'WARNING', 'WATCH', 'HEALTHY'];
const SORT_OPTIONS = [
  { value: 'status', label: 'By Alert Severity' },
  { value: 'dos', label: 'By Days of Supply' },
  { value: 'name', label: 'A–Z Name' },
];

export default function SKUFilters({ filters, categories, onChange }: Props) {
  const set = (key: keyof FilterState) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
      <SlidersHorizontal size={16} className="text-slate-400 shrink-0" />

      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search SKU name or code…"
          value={filters.search}
          onChange={set('search')}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Category */}
      <select
        value={filters.category}
        onChange={set('category')}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      >
        <option value="">All Categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={set('status')}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      >
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
      </select>

      {/* Promo */}
      <select
        value={filters.promo}
        onChange={set('promo')}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      >
        <option value="">All (promo + non-promo)</option>
        <option value="true">On Promotion</option>
        <option value="false">Not on Promotion</option>
      </select>

      {/* Sort */}
      <select
        value={filters.sortBy}
        onChange={set('sortBy')}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      >
        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
