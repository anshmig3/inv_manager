import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Package, Truck, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';

interface WeeklyReportData {
  period_start: string;
  period_end: string;
  total_skus: number;
  stockout_events: number;
  stockout_skus: string[];
  total_shrinkage_cost: number;
  shrinkage_by_reason: Record<string, number>;
  pos_sent: number;
  pos_overdue: number;
  overdue_pos: { po_number: string; sku_name: string; days_overdue: number }[];
  alerts_created: number;
  alerts_resolved: number;
  alert_resolution_rate: number;
  top_consumed_skus: { name: string; quantity: number; unit: string }[];
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

  const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <RefreshCw size={16} className="mr-2 animate-spin" /> Generating report…
    </div>
  );

  if (error) return (
    <div className="text-red-400 bg-red-950/30 border border-red-700 rounded-xl p-4">{error}</div>
  );

  if (!report) return null;

  const shrinkageEntries = Object.entries(report.shrinkage_by_reason);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Week of {fmt(report.period_start)} — {fmt(report.period_end)}
        </p>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Stockout Events" value={report.stockout_events} sub={`${report.total_skus} SKUs tracked`}
          icon={<TrendingDown size={16} />} color="text-red-400" />
        <StatCard label="Shrinkage Cost" value={`£${report.total_shrinkage_cost.toFixed(2)}`}
          sub="This week" icon={<AlertTriangle size={16} />} color="text-amber-400" />
        <StatCard label="POs Sent" value={report.pos_sent} sub={report.pos_overdue > 0 ? `${report.pos_overdue} overdue` : 'All on time'}
          icon={<Truck size={16} />} color={report.pos_overdue > 0 ? 'text-amber-400' : 'text-cyan-400'} />
        <StatCard label="Alert Resolution" value={`${report.alert_resolution_rate.toFixed(0)}%`}
          sub={`${report.alerts_resolved} of ${report.alerts_created} resolved`}
          icon={<CheckCircle size={16} />}
          color={report.alert_resolution_rate >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stockout SKUs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} className="text-red-400" />
            <h3 className="text-sm font-semibold text-white">Stockout SKUs</h3>
          </div>
          {report.stockout_skus.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={12} /> No stockouts this week
            </p>
          ) : (
            <ul className="space-y-1.5">
              {report.stockout_skus.map(name => (
                <li key={name} className="text-xs text-red-300 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-1.5">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Shrinkage by reason */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Shrinkage by Reason</h3>
          </div>
          {shrinkageEntries.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={12} /> No shrinkage recorded
            </p>
          ) : (
            <div className="space-y-2">
              {shrinkageEntries.map(([reason, cost]) => (
                <div key={reason} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{reason.replace(/_/g, ' ')}</span>
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
          {report.overdue_pos.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={12} /> All deliveries on schedule
            </p>
          ) : (
            <ul className="space-y-1.5">
              {report.overdue_pos.map(po => (
                <li key={po.po_number} className="text-xs bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                  <p className="text-amber-300 font-semibold">{po.po_number}</p>
                  <p className="text-slate-400">{po.sku_name} · {po.days_overdue}d overdue</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top consumed */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Top Consumed SKUs</h3>
          </div>
          {report.top_consumed_skus.length === 0 ? (
            <p className="text-xs text-slate-500">No consumption data</p>
          ) : (
            <div className="space-y-2">
              {report.top_consumed_skus.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3 text-xs">
                  <span className="w-5 text-slate-600 font-bold">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-slate-300">{s.name}</span>
                      <span className="text-slate-400">{s.quantity} {s.unit}</span>
                    </div>
                    <div className="h-1 bg-slate-700 rounded-full">
                      <div className="h-1 bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, (s.quantity / (report.top_consumed_skus[0]?.quantity || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SKU inventory summary mini-stat */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
        <Package size={16} className="text-violet-400" />
        <p className="text-sm text-slate-300">
          Tracking <span className="font-bold text-white">{report.total_skus}</span> active SKUs across all departments
        </p>
      </div>
    </div>
  );
}
