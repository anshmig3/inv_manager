import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Disposal {
  id: number; sku_id: number; sku_name: string; quantity: number;
  unit_cost: number; total_cost: number; reason: string; method: string;
  actioned_by: string; status: string; approved_by: string | null;
  notes: string | null; created_at: string;
}

const REASONS = ['EXPIRED', 'DAMAGED', 'CONTAMINATED', 'THEFT', 'OTHER'];
const METHODS = ['BIN', 'DONATE', 'RETURN_TO_SUPPLIER'];

const REASON_META: Record<string, { color: string; label: string }> = {
  EXPIRED:      { color: 'text-amber-400',  label: 'Expired' },
  DAMAGED:      { color: 'text-orange-400', label: 'Damaged' },
  CONTAMINATED: { color: 'text-red-400',    label: 'Contaminated' },
  THEFT:        { color: 'text-red-500',    label: 'Theft' },
  OTHER:        { color: 'text-slate-400',  label: 'Other' },
};

function fmtDate(s: string) {
  return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [skus, setSkus] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({ sku_id: 0, quantity: '', reason: 'EXPIRED', method: 'BIN', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSKUs().then(s => setSkus(s.map(x => ({ id: x.id, name: x.name }))));
  }, []);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.sku_id || !form.quantity) { setError('SKU and quantity are required'); return; }
    setLoading(true); setError('');
    try {
      await api.createDisposal({ sku_id: form.sku_id, quantity: Number(form.quantity), reason: form.reason, method: form.method, notes: form.notes || undefined });
      onCreated(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create disposal');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Trash2 size={16} className="text-red-400" /> Log Disposal
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
              <label className="block text-xs text-slate-400 mb-1">Quantity *</label>
              <input type="number" min="0.1" step="0.1" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason</label>
              <select value={form.reason} onChange={e => set('reason', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Method</label>
            <select value={form.method} onChange={e => set('method', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500">
              {METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Log Disposal'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DisposalLog() {
  const { user } = useAuth();
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const canApprove = user?.role === 'ADMIN' || user?.role === 'STORE_MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    try { setDisposals((await api.getDisposals(statusFilter ? { status: statusFilter } : undefined)) as unknown as Disposal[]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    await api.approveDisposal(id);
    load();
  };

  const totalCost = disposals.filter(d => d.status === 'COMPLETED').reduce((s, d) => s + d.total_cost, 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-400">
            {disposals.length} records · <span className="text-red-400 font-semibold">£{totalCost.toFixed(2)} total shrinkage</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            <Plus size={13} /> Log Disposal
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'PENDING_APPROVAL', 'COMPLETED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {s === '' ? 'All' : s === 'PENDING_APPROVAL' ? 'Pending Approval' : 'Completed'}
          </button>
        ))}
      </div>

      {loading && disposals.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-500"><RefreshCw size={16} className="animate-spin mr-2" /> Loading…</div>
      ) : disposals.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No disposals found</div>
      ) : (
        <div className="space-y-2">
          {disposals.map(d => {
            const rm = REASON_META[d.reason] ?? REASON_META.OTHER;
            return (
              <div key={d.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{d.sku_name}</p>
                    <span className={`text-xs font-semibold ${rm.color}`}>{rm.label}</span>
                    <span className="text-xs text-slate-500">{d.method.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {d.quantity} units · £{d.total_cost.toFixed(2)} · {d.actioned_by} · {fmtDate(d.created_at)}
                  </p>
                  {d.notes && <p className="text-xs text-slate-500 italic mt-0.5">{d.notes}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {d.status === 'PENDING_APPROVAL' ? (
                    <>
                      <span className="text-xs text-amber-400 flex items-center gap-1"><Clock size={11} /> Pending</span>
                      {canApprove && (
                        <button onClick={() => approve(d.id)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-700 text-emerald-400 hover:bg-emerald-600/40 transition-colors">
                          Approve
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> Done</span>
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
