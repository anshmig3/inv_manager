import { AlertTriangle, Package, TrendingDown, Tag, RefreshCw } from 'lucide-react';
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
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 ${color}`}>
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-0.5 opacity-75">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardSummary({ data, onRefresh, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-sm text-slate-500">{data.total_skus} SKUs tracked</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Critical"
          value={data.critical_count}
          icon={<AlertTriangle size={22} />}
          color="bg-red-50 text-red-700"
        />
        <StatTile
          label="Stockouts"
          value={data.stockout_count}
          icon={<Package size={22} />}
          color="bg-red-100 text-red-800"
        />
        <StatTile
          label="Low Stock"
          value={data.low_stock_count}
          icon={<TrendingDown size={22} />}
          color="bg-amber-50 text-amber-700"
        />
        <StatTile
          label="Near Expiry"
          value={data.near_expiry_count}
          icon={<AlertTriangle size={22} />}
          color="bg-amber-100 text-amber-800"
        />
        <StatTile
          label="Warnings"
          value={data.warning_count}
          icon={<AlertTriangle size={22} />}
          color="bg-yellow-50 text-yellow-700"
        />
        <StatTile
          label="On Promotion"
          value={data.promo_active_count}
          icon={<Tag size={22} />}
          color="bg-purple-50 text-purple-700"
        />
        <StatTile
          label="Watch"
          value={data.watch_count}
          icon={<AlertTriangle size={22} />}
          color="bg-blue-50 text-blue-700"
        />
        <StatTile
          label="Healthy"
          value={data.healthy_count}
          icon={<Package size={22} />}
          color="bg-green-50 text-green-700"
        />
      </div>
    </div>
  );
}
