import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Truck, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';

interface WeeklyReportData {
  period: { from: string; to: string };
  stockout_incidents: number;
  stockout_skus: number[];
  total_shrinkage_cost: number;
  shrinkage_by_category: Record<string, number>;
  disposal_count: number;
  pos_sent: number;
  pos_overdue: number;
  overdue_po_details: { po_number: string; supplier: string; expected: string | null; status: string }[];
  total_alerts: number;
  resolved_alerts: number;
  alert_resolution_rate_pct: number;
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-slate-400">{label}</p>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function WeeklyReport() {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setReport((await api.getWeeklyReport()) as unknown as WeeklyReportData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '?';

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <RefreshCw size={16} className="mr-2 animate-spin" /> Generating report…
    </div>
  );

  if (error) return (
    <div className="text-red-400 bg-red-950/30 border border-red-700 rounded-xl p-4">{error}</div>
  );

  if (!report) return null;

  const shrinkageEntries = Object.entries(report.shrinkage_by_category);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Week of {fmt(report.period.from)} — {fmt(report.period.to)}
        </p>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Stockout Events" value={report.stockout_incidents} sub={`${report.disposal_count} disposals`}
          icon={<TrendingDown size={16} />} color="text-red-400" />
        <StatCard label="Shrinkage Cost" value={`£${report.total_shrinkage_cost.toFixed(2)}`}
          sub="This week" icon={<AlertTriangle size={16} />} color="text-amber-400" />
        <StatCard label="POs Sent" value={report.pos_sent} sub={report.pos_overdue > 0 ? `${report.pos_overdue} overdue` : 'All on time'}
          icon={<Truck size={16} />} color={report.pos_overdue > 0 ? 'text-amber-400' : 'text-cyan-400'} />
        <StatCard label="Alert Resolution" value={`${report.alert_resolution_rate_pct.toFixed(0)}%`}
          sub={`${report.resolved_alerts} of ${report.total_alerts} resolved`}
          icon={<CheckCircle size={16} />}
          color={report.alert_resolution_rate_pct >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stockout events */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} className="text-red-400" />
            <h3 className="text-sm font-semibold text-white">Stockout Events</h3>
          </div>
          {report.stockout_incidents === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={12} /> No stockouts this week
            </p>
          ) : (
            <p className="text-2xl font-bold text-red-400">{report.stockout_incidents}</p>
          )}
        </div>

        {/* Shrinkage by category */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Shrinkage by Category</h3>
          </div>
          {shrinkageEntries.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={12} /> No shrinkage recorded
            </p>
          ) : (
            <div className="space-y-2">
              {shrinkageEntries.map(([cat, cost]) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{cat}</span>
                  <span className="text-amber-300 font-semibold">£{(cost as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue POs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Overdue Purchase Orders</h3>
          </div>
          {report.overdue_po_details.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={12} /> All deliveries on schedule
            </p>
          ) : (
            <ul className="space-y-1.5">
              {report.overdue_po_details.map(po => (
                <li key={po.po_number} className="text-xs bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                  <p className="text-amber-300 font-semibold">{po.po_number}</p>
                  <p className="text-slate-400">{po.supplier} · Expected {fmt(po.expected)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Disposals this week */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Weekly Summary</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Disposals</span>
              <span className="text-white font-semibold">{report.disposal_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">POs sent</span>
              <span className="text-white font-semibold">{report.pos_sent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Alerts created</span>
              <span className="text-white font-semibold">{report.total_alerts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Alerts resolved</span>
              <span className="text-emerald-400 font-semibold">{report.resolved_alerts}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
