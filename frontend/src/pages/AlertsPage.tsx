import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle, UserCheck, XCircle, RefreshCw,
  Clock, Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { AlertOut } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  OPEN:         { label: 'Open',         color: 'text-red-400',    bg: 'bg-red-950/50',    border: 'border-red-700' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'text-amber-400',  bg: 'bg-amber-950/50',  border: 'border-amber-700' },
  IN_PROGRESS:  { label: 'In Progress',  color: 'text-cyan-400',   bg: 'bg-cyan-950/50',   border: 'border-cyan-700' },
  RESOLVED:     { label: 'Resolved',     color: 'text-emerald-400',bg: 'bg-emerald-950/50',border: 'border-emerald-700' },
};

const SEVERITY_META: Record<string, { color: string; dot: string }> = {
  CRITICAL: { color: 'text-red-400',    dot: 'bg-red-500' },
  HIGH:     { color: 'text-orange-400', dot: 'bg-orange-500' },
  MEDIUM:   { color: 'text-amber-400',  dot: 'bg-amber-500' },
  LOW:      { color: 'text-slate-400',  dot: 'bg-slate-500' },
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface ActionModalProps {
  alert: AlertOut;
  action: 'acknowledge' | 'assign' | 'resolve';
  users: { email: string; full_name: string }[];
  onConfirm: (payload: Record<string, string>) => void;
  onClose: () => void;
}

function ActionModal({ alert, action, users, onConfirm, onClose }: ActionModalProps) {
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState('');
  const [resolution, setResolution] = useState('');

  const titles = { acknowledge: 'Acknowledge Alert', assign: 'Assign Alert', resolve: 'Resolve Alert' };
  const icons = {
    acknowledge: <CheckCircle size={18} className="text-amber-400" />,
    assign: <UserCheck size={18} className="text-cyan-400" />,
    resolve: <XCircle size={18} className="text-emerald-400" />,
  };

  const handleSubmit = () => {
    if (action === 'assign' && !assignee) return;
    if (action === 'resolve' && !resolution.trim()) return;
    const payload: Record<string, string> = {};
    if (action === 'acknowledge' && note) payload.note = note;
    if (action === 'assign') { payload.assigned_to = assignee; if (note) payload.note = note; }
    if (action === 'resolve') payload.resolution_action = resolution;
    onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {icons[action]}
          <h3 className="text-base font-semibold text-white">{titles[action]}</h3>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
          <p className="text-sm font-medium text-white">{alert.message}</p>
          <p className="text-xs text-slate-400 mt-1">SKU #{alert.sku_id} · {alert.alert_type} · {alert.severity}</p>
        </div>

        {action === 'assign' && (
          <div className="mb-4">
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Assign to</label>
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">— Select user —</option>
              {users.map(u => (
                <option key={u.email} value={u.email}>{u.full_name} ({u.email})</option>
              ))}
            </select>
          </div>
        )}

        {action === 'resolve' && (
          <div className="mb-4">
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Resolution action *</label>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              rows={3}
              placeholder="Describe what action was taken to resolve this alert…"
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          </div>
        )}

        {(action === 'acknowledge' || action === 'assign') && (
          <div className="mb-4">
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note…"
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={action === 'assign' && !assignee || action === 'resolve' && !resolution.trim()}
            className="px-4 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface AlertRowProps {
  alert: AlertOut;
  onAction: (alert: AlertOut, action: 'acknowledge' | 'assign' | 'resolve') => void;
  canEdit: boolean;
}

function AlertRow({ alert, onAction, canEdit }: AlertRowProps) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = STATUS_META[alert.status] ?? STATUS_META.OPEN;
  const sevMeta = SEVERITY_META[alert.severity] ?? SEVERITY_META.LOW;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-750 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${sevMeta.dot} mt-2`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white leading-snug">{alert.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                SKU #{alert.sku_id} · {alert.alert_type} ·{' '}
                <span className={sevMeta.color}>{alert.severity}</span> ·{' '}
                {fmtDate(alert.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                {statusMeta.label}
              </span>
              {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/60 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
            {alert.acknowledged_by && (
              <div>
                <p className="text-slate-500 uppercase tracking-wider mb-0.5">Acknowledged by</p>
                <p className="text-slate-300">{alert.acknowledged_by}</p>
                <p className="text-slate-500">{fmtDate(alert.acknowledged_at)}</p>
              </div>
            )}
            {alert.assigned_to && (
              <div>
                <p className="text-slate-500 uppercase tracking-wider mb-0.5">Assigned to</p>
                <p className="text-slate-300">{alert.assigned_to}</p>
                {alert.assignment_note && <p className="text-slate-500 italic">{alert.assignment_note}</p>}
              </div>
            )}
            {alert.resolved_by && (
              <div>
                <p className="text-slate-500 uppercase tracking-wider mb-0.5">Resolved by</p>
                <p className="text-slate-300">{alert.resolved_by}</p>
                <p className="text-slate-500">{fmtDate(alert.resolved_at)}</p>
                {alert.resolution_action && <p className="text-slate-400 italic mt-0.5">{alert.resolution_action}</p>}
              </div>
            )}
          </div>

          {canEdit && alert.status !== 'RESOLVED' && (
            <div className="flex flex-wrap gap-2">
              {alert.status === 'OPEN' && (
                <button
                  onClick={e => { e.stopPropagation(); onAction(alert, 'acknowledge'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600/20 border border-amber-700 text-amber-400 hover:bg-amber-600/40 transition-colors"
                >
                  <CheckCircle size={13} /> Acknowledge
                </button>
              )}
              {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
                <button
                  onClick={e => { e.stopPropagation(); onAction(alert, 'assign'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600/20 border border-cyan-700 text-cyan-400 hover:bg-cyan-600/40 transition-colors"
                >
                  <UserCheck size={13} /> Assign
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onAction(alert, 'resolve'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 border border-emerald-700 text-emerald-400 hover:bg-emerald-600/40 transition-colors"
              >
                <XCircle size={13} /> Resolve
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [users, setUsers] = useState<{ email: string; full_name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [modal, setModal] = useState<{ alert: AlertOut; action: 'acknowledge' | 'assign' | 'resolve' } | null>(null);

  const canEdit = user?.role !== 'READ_ONLY';
  const canScan = user?.role === 'ADMIN' || user?.role === 'STORE_MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([
        api.getAlerts(statusFilter || undefined),
        api.getUsers(),
      ]);
      setAlerts(a);
      setUsers(u);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await api.triggerAlertScan();
      await load();
    } finally {
      setScanning(false);
    }
  };

  const handleAction = (alert: AlertOut, action: 'acknowledge' | 'assign' | 'resolve') => {
    setModal({ alert, action });
  };

  const handleConfirm = async (payload: Record<string, string>) => {
    if (!modal) return;
    const { alert, action } = modal;
    setModal(null);
    try {
      if (action === 'acknowledge') await api.acknowledgeAlert(alert.id, payload.note);
      if (action === 'assign') await api.assignAlert(alert.id, payload.assigned_to, payload.note);
      if (action === 'resolve') await api.resolveAlert(alert.id, payload.resolution_action);
      await load();
    } catch {
      // error silently for now
    }
  };

  const counts = alerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Alert Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{alerts.length} alerts{statusFilter ? ` · ${STATUS_META[statusFilter]?.label}` : ' · all statuses'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {canScan && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:opacity-50"
            >
              <AlertTriangle size={14} />
              {scanning ? 'Scanning…' : 'Run Scan'}
            </button>
          )}
        </div>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(prev => prev === key ? '' : key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              statusFilter === key
                ? `${meta.bg} ${meta.color} ${meta.border}`
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
            }`}
          >
            <Filter size={11} />
            {meta.label}
            {counts[key] !== undefined && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${statusFilter === key ? meta.bg : 'bg-slate-700'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading && alerts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Clock size={18} className="mr-2 animate-spin" /> Loading alerts…
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <CheckCircle size={36} className="text-emerald-600 opacity-50" />
          <p className="font-medium">No alerts{statusFilter ? ` with status ${STATUS_META[statusFilter]?.label}` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <AlertRow key={a.id} alert={a} onAction={handleAction} canEdit={canEdit} />
          ))}
        </div>
      )}

      {modal && (
        <ActionModal
          alert={modal.alert}
          action={modal.action}
          users={users}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
