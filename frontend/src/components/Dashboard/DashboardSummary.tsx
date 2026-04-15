import { AlertTriangle, Package, TrendingDown, Tag, RefreshCw, CheckCircle, Eye } from 'lucide-react';
import type { DashboardOut } from '../../types';

interface Props {
  data: DashboardOut;
  onRefresh: () => void;
  loading: boolean;
}

function StatTile({
  label,
  value,
  icon,
  valueColor,
  borderColor,
  urgent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueColor: string;
  borderColor: string;
  urgent?: boolean;
}) {
  return (
    <div className={`relative flex flex-col justify-between bg-slate-800 rounded-xl p-4 border-l-4 ${borderColor} overflow-hidden`}>
      {urgent && value > 0 && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
        <div className="opacity-40">{icon}</div>
      </div>
      <p className={`text-4xl font-bold leading-none ${valueColor}`}>{value}</p>
    </div>
  );
}

export default function DashboardSummary({ data, onRefresh, loading }: Props) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Inventory Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{data.total_skus} SKUs tracked</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Critical"
          value={data.critical_count}
          icon={<AlertTriangle size={20} className="text-red-400" />}
          valueColor="text-red-400"
          borderColor="border-red-500"
          urgent
        />
        <StatTile
          label="Stockouts"
          value={data.stockout_count}
          icon={<Package size={20} className="text-red-300" />}
          valueColor="text-red-300"
          borderColor="border-red-400"
          urgent
        />
        <StatTile
          label="Low Stock"
          value={data.low_stock_count}
          icon={<TrendingDown size={20} className="text-amber-400" />}
          valueColor="text-amber-400"
          borderColor="border-amber-500"
        />
        <StatTile
          label="Near Expiry"
          value={data.near_expiry_count}
          icon={<AlertTriangle size={20} className="text-amber-300" />}
          valueColor="text-amber-300"
          borderColor="border-amber-400"
        />
        <StatTile
          label="Warnings"
          value={data.warning_count}
          icon={<AlertTriangle size={20} className="text-yellow-400" />}
          valueColor="text-yellow-400"
          borderColor="border-yellow-500"
        />
        <StatTile
          label="On Promotion"
          value={data.promo_active_count}
          icon={<Tag size={20} className="text-violet-400" />}
          valueColor="text-violet-400"
          borderColor="border-violet-500"
        />
        <StatTile
          label="Watch"
          value={data.watch_count}
          icon={<Eye size={20} className="text-cyan-400" />}
          valueColor="text-cyan-400"
          borderColor="border-cyan-500"
        />
        <StatTile
          label="Healthy"
          value={data.healthy_count}
          icon={<CheckCircle size={20} className="text-emerald-400" />}
          valueColor="text-emerald-400"
          borderColor="border-emerald-500"
        />
      </div>
    </div>
  );
}
