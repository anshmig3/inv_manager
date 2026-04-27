import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeftRight, RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Transfer {
  id: number; sku_id: number; sku_name: string;
  from_department: string; to_department: string; quantity: number;
  reason: string | null; status: string; requested_by: string;
  approved_by: string | null; created_at: string;
  approved_at: string | null; completed_at: string | null;
}

const STATUS_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING:   { color: 'text-amber-400',  icon: <Clock size={12} />,        label: 'Pending' },
  APPROVED:  { color: 'text-cyan-400',   icon: <CheckCircle size={12} />,  label: 'Approved' },
  COMPLETED: { color: 'text-emerald-400',icon: <CheckCircle size={12} />,  label: 'Completed' },
  REJECTED:  { color: 'text-red-400',    icon: <XCircle size={12} />,      label: 'Rejected' },
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [skus, setSkus] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({ sku_id: 0, from_department: '', to_department: '', quantity: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getSKUs().then(s => setSkus(s.map(x => ({ id: x.id, name: x.name })))); }, []);
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.sku_id || !form.from_department || !form.to_department || !form.quantity) {
      setError('All fields except reason are required'); return;
    }
    setLoading(true); setError('');
    try {
      await api.createTransfer({ sku_id: form.sku_id, from_department: form.from_department, to_department: form.to_department, quantity: Number(form.quantity), reason: form.reason || undefined });
      onCreated(); onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <ArrowLeftRight size={16} className="text-violet-400" /> New Transfer Request
        </h3>
        {error && <div className="text-red-300 text-xs bg-red-950/50 border border-red-700 rounded-lg px-3 py-2 mb-4">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">SKU *</label>
            <select value={form.sku_id} onChange={e => set('sku_id', Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value={0}>— select —</option>
              {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">From Dept *</label>
              <input value={form.from_department} onChange={e => set('from_department', e.target.value)} placeholder="e.g. Dairy" className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">To Dept *</label>
              <input value={form.to_department} onChange={e => set('to_department', e.target.value)} placeholder="e.g. Deli" className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantity *</label>
            <input type="number" min="0.1" step="0.1" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Reason</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Create Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const canApprove = user?.role === 'ADMIN' || user?.role === 'STORE_MANAGER';
  const canComplete = canApprove || user?.role === 'DEPT_HEAD';

  const load = useCallback(async () => {
    setLoading(true);
    try { setTransfers((await api.getTransfers()) as unknown as Transfer[]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{transfers.length} transfer requests</p>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
            <Plus size={13} /> New Transfer
          </button>
        </div>
      </div>

      {transfers.length === 0 && !loading ? (
        <div className="text-center py-16 text-slate-500">No transfer requests</div>
      ) : (
        <div className="space-y-2">
          {transfers.map(t => {
            const sm = STATUS_META[t.status] ?? STATUS_META.PENDING;
            return (
              <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{t.sku_name}</p>
                    <span className="text-xs text-slate-400">{t.from_department} → {t.to_department}</span>
                    <span className="text-xs text-slate-500">{t.quantity} units</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Requested by {t.requested_by} on {fmtDate(t.created_at)}
                    {t.approved_by && ` · Approved by ${t.approved_by}`}
                  </p>
                  {t.reason && <p className="text-xs text-slate-500 italic mt-0.5">{t.reason}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-xs flex items-center gap-1 ${sm.color}`}>{sm.icon} {sm.label}</span>
                  {t.status === 'PENDING' && canApprove && (
                    <button onClick={async () => { await api.approveTransfer(t.id); load(); }} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-700 text-cyan-400 hover:bg-cyan-600/40 transition-colors">
                      Approve
                    </button>
                  )}
                  {t.status === 'APPROVED' && canComplete && (
                    <button onClick={async () => { await api.completeTransfer(t.id); load(); }} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-700 text-emerald-400 hover:bg-emerald-600/40 transition-colors">
                      Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
