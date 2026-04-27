import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { api } from '../../api/client';

interface AuditEntry {
  id: number; timestamp: string; user_email: string; user_name: string;
  action_type: string; entity_type: string | null; entity_id: number | null;
  entity_name: string | null; before_value: string | null; after_value: string | null;
  detail: string | null; source: string;
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN:            'text-slate-400',
  STOCK_ADJUSTMENT: 'text-amber-400',
  DISPOSAL:         'text-red-400',
  PO_CREATE:        'text-cyan-400',
  PO_APPROVE:       'text-cyan-400',
  PO_SEND:          'text-cyan-400',
  PO_RECEIVE:       'text-emerald-400',
  ALERT_ACKNOWLEDGE:'text-amber-400',
  ALERT_RESOLVE:    'text-emerald-400',
  ALERT_CREATE:     'text-red-400',
  USER_CREATE:      'text-violet-400',
  USER_UPDATE:      'text-violet-400',
  TRANSFER_CREATE:  'text-indigo-400',
  TRANSFER_APPROVE: 'text-indigo-400',
  COST_UPDATE:      'text-orange-400',
  CYCLE_COUNT:      'text-cyan-400',
};

function fmtTime(s: string) {
  return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (actionFilter) params.action_type = actionFilter;
      setEntries((await api.getAuditLog(params)) as unknown as AuditEntry[]);
    } finally { setLoading(false); }
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e =>
    !search ||
    e.user_name.toLowerCase().includes(search.toLowerCase()) ||
    e.action_type.toLowerCase().includes(search.toLowerCase()) ||
    (e.entity_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.detail ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const actionTypes = [...new Set(entries.map(e => e.action_type))].sort();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{filtered.length} of {entries.length} entries</p>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, action, entity…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500">
          <option value="">All actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider">Entity</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">No entries found</td></tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmtTime(e.timestamp)}</td>
                    <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{e.user_name}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`font-semibold ${ACTION_COLOR[e.action_type] ?? 'text-slate-300'}`}>
                        {e.action_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                      {e.entity_name ?? (e.entity_type ? `${e.entity_type} #${e.entity_id}` : '—')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate" title={e.detail ?? ''}>
                      {e.detail ?? (e.before_value && e.after_value ? `${e.before_value} → ${e.after_value}` : '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
