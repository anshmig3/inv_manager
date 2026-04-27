import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Supplier {
  id: number; name: string; contact_name: string | null; email: string;
  phone: string | null; is_active: boolean; notes: string | null;
  created_at: string; fill_rate: number | null; on_time_rate: number | null;
}

function ScoreBar({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-xs text-slate-500">No data</span>;
  const color = value >= 95 ? 'bg-emerald-500' : value >= 80 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-semibold">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ name: '', email: '', contact_name: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email) { setError('Name and email required'); return; }
    setLoading(true); setError('');
    try {
      await api.createSupplier({ name: form.name, email: form.email, contact_name: form.contact_name || undefined, phone: form.phone || undefined, notes: form.notes || undefined });
      onCreated(); onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-4">Add Supplier</h3>
        {error && <div className="text-red-300 text-xs bg-red-950/50 border border-red-700 rounded-lg px-3 py-2 mb-4">{error}</div>}
        <div className="space-y-3">
          {[
            { k: 'name',         label: 'Company name *',  ph: 'DairyFresh Co.' },
            { k: 'email',        label: 'Email *',          ph: 'orders@supplier.com' },
            { k: 'contact_name', label: 'Contact name',     ph: 'Jane Smith' },
            { k: 'phone',        label: 'Phone',            ph: '+44 7700 900000' },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input value={(form as Record<string, string>)[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupplierManagement() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STORE_MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    try { setSuppliers((await api.getSuppliers()) as unknown as Supplier[]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (s: Supplier) => {
    await api.updateSupplier(s.id, { is_active: !s.is_active });
    setSuppliers(ss => ss.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{suppliers.length} suppliers · {suppliers.filter(s => s.is_active).length} active</p>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canEdit && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              <Plus size={13} /> Add Supplier
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suppliers.map(s => (
          <div key={s.id} className={`bg-slate-800 border rounded-xl p-4 ${s.is_active ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">{s.name}</p>
                {s.contact_name && <p className="text-xs text-slate-400">{s.contact_name}</p>}
                <p className="text-xs text-slate-500">{s.email}</p>
              </div>
              {canEdit && (
                <button onClick={() => toggleActive(s)} className={`shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${s.is_active ? 'bg-red-950/30 border-red-700/50 text-red-400 hover:bg-red-950/60' : 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/60'}`}>
                  {s.is_active ? <XCircle size={11} /> : <CheckCircle size={11} />}
                  {s.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                <TrendingUp size={11} /> 90-day scorecard
              </div>
              <ScoreBar value={s.fill_rate} label="Fill rate" />
              <ScoreBar value={s.on_time_rate} label="On-time rate" />
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
