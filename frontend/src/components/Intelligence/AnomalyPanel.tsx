import { useState, useCallback } from 'react';
import { Zap, AlertTriangle, TrendingUp, Package, RefreshCw, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';

interface AnomalyResult {
  sku_id: number;
  sku_name: string;
  anomaly_type: 'CONSUMPTION_SPIKE' | 'HIGH_SHRINKAGE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
  current_value: number;
  threshold: number;
  unit: string;
}

interface ScanResult {
  scanned_at: string;
  anomalies_found: number;
  anomalies: AnomalyResult[];
}

const SEVERITY_COLOR: Record<string, string> = {
  HIGH:   'text-red-400 bg-red-950/40 border-red-700/60',
  MEDIUM: 'text-amber-400 bg-amber-950/40 border-amber-700/60',
  LOW:    'text-yellow-400 bg-yellow-950/40 border-yellow-700/60',
};

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CONSUMPTION_SPIKE: { label: 'Consumption Spike', icon: <TrendingUp size={13} />, color: 'text-orange-400' },
  HIGH_SHRINKAGE:    { label: 'High Shrinkage',    icon: <Package size={13} />,    color: 'text-red-400' },
};

export default function AnomalyPanel() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scan = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setResult((await api.scanAnomalies()) as unknown as ScanResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally { setLoading(false); }
  }, []);

  const fmtTime = (s: string) =>
    new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-3xl">
      {/* Header / scan trigger */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-amber-400" />
            <h2 className="text-base font-semibold text-white">Anomaly Detection</h2>
          </div>
          <p className="text-xs text-slate-400">
            Scans for consumption spikes (&gt;2.5× 30-day average) and shrinkage rate &gt;3%.
            {result && <span className="ml-2 text-slate-500">Last scan: {fmtTime(result.scanned_at)}</span>}
          </p>
        </div>
        <button onClick={scan} disabled={loading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? 'Scanning…' : 'Run Scan'}
        </button>
      </div>

      {error && (
        <div className="text-red-300 text-xs bg-red-950/50 border border-red-700 rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {result && (
        <>
          {result.anomalies_found === 0 ? (
            <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-700/50 rounded-xl px-5 py-4">
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">No anomalies detected</p>
                <p className="text-xs text-slate-400 mt-0.5">All SKUs are within normal consumption and shrinkage thresholds.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400" />
                <p className="text-sm font-semibold text-white">
                  {result.anomalies_found} anomal{result.anomalies_found === 1 ? 'y' : 'ies'} detected
                </p>
              </div>
              <div className="space-y-2">
                {result.anomalies.map((a, idx) => {
                  const tm = TYPE_META[a.anomaly_type] ?? TYPE_META.CONSUMPTION_SPIKE;
                  const sev = SEVERITY_COLOR[a.severity] ?? SEVERITY_COLOR.LOW;
                  return (
                    <div key={idx} className={`border rounded-xl px-4 py-3 ${sev}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={tm.color}>{tm.icon}</span>
                          <p className="text-sm font-semibold text-white">{a.sku_name}</p>
                          <span className={`text-xs ${tm.color}`}>{tm.label}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sev}`}>
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{a.detail}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Current: <span className="text-white font-medium">{a.current_value.toFixed(2)} {a.unit}</span></span>
                        <span>Threshold: <span className="text-white font-medium">{a.threshold.toFixed(2)} {a.unit}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-slate-500 text-sm">
          Click "Run Scan" to detect consumption anomalies and shrinkage issues.
        </div>
      )}
    </div>
  );
}
