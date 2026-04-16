import { useState, useEffect } from 'react';
import { Users, Plus, UserCheck, UserX, RefreshCw, X, Shield } from 'lucide-react';
import type { User } from '../../types';
import { api } from '../../api/client';

const ROLES = ['ADMIN', 'STORE_MANAGER', 'DEPT_HEAD', 'FLOOR_STAFF', 'READ_ONLY'] as const;

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ADMIN:         { label: 'Admin',        color: 'text-red-400',    bg: 'bg-red-950/50',    border: 'border-red-700' },
  STORE_MANAGER: { label: 'Manager',      color: 'text-cyan-400',   bg: 'bg-cyan-950/50',   border: 'border-cyan-700' },
  DEPT_HEAD:     { label: 'Dept Head',    color: 'text-amber-400',  bg: 'bg-amber-950/50',  border: 'border-amber-700' },
  FLOOR_STAFF:   { label: 'Floor Staff',  color: 'text-slate-300',  bg: 'bg-slate-700',     border: 'border-slate-600' },
  READ_ONLY:     { label: 'Read Only',    color: 'text-slate-400',  bg: 'bg-slate-800',     border: 'border-slate-600' },
};

function fmtDate(s: string | null) {
  if (!s) return 'Never';
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface CreateUserModalProps {
  onConfirm: (body: { email: string; full_name: string; password: string; role: string; department?: string }) => Promise<void>;
  onClose: () => void;
}

function CreateUserModal({ onConfirm, onClose }: CreateUserModalProps) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'FLOOR_STAFF', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.full_name || !form.password) { setError('Email, name, and password are required.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        role: form.role,
        department: form.department || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Create New User</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Full name *</label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@groceryiq.com"
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5">Role *</label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5">Department</label>
              <input
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="e.g. Dairy"
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UserRowProps {
  user: User;
  onToggleActive: (user: User) => void;
  onRoleChange: (user: User, role: string) => void;
}

function UserRow({ user, onToggleActive, onRoleChange }: UserRowProps) {
  const meta = ROLE_META[user.role] ?? ROLE_META.READ_ONLY;
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-opacity ${
      user.is_active ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800 opacity-60'
    }`}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-slate-300">
          {user.full_name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
          {!user.is_active && (
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">Inactive</span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {user.department ? `${user.department} · ` : ''}Last login: {fmtDate(user.last_login)}
        </p>
      </div>

      {/* Role selector */}
      <div className="shrink-0">
        <select
          value={user.role}
          onChange={e => onRoleChange(user, e.target.value)}
          className={`text-xs font-semibold px-2 py-1.5 rounded-lg border ${meta.bg} ${meta.color} ${meta.border} bg-transparent focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer`}
        >
          {ROLES.map(r => (
            <option key={r} value={r} className="bg-slate-800 text-slate-100">{ROLE_META[r].label}</option>
          ))}
        </select>
      </div>

      {/* Active toggle */}
      <button
        onClick={() => onToggleActive(user)}
        title={user.is_active ? 'Deactivate user' : 'Activate user'}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          user.is_active
            ? 'bg-red-950/30 border-red-700/50 text-red-400 hover:bg-red-950/60'
            : 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/60'
        }`}
      >
        {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
        {user.is_active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.getUsers()); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (user: User) => {
    await api.updateUser(user.id, { is_active: !user.is_active });
    setUsers(us => us.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
  };

  const handleRoleChange = async (user: User, role: string) => {
    await api.updateUser(user.id, { role });
    setUsers(us => us.map(u => u.id === user.id ? { ...u, role } : u));
  };

  const handleCreate = async (body: { email: string; full_name: string; password: string; role: string; department?: string }) => {
    const created = await api.createUser(body);
    setUsers(us => [...us, created]);
  };

  const active = users.filter(u => u.is_active).length;
  const roleGroups = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {users.length} users · {active} active
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Role breakdown */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ROLES.filter(r => roleGroups[r] > 0).map(r => {
          const m = ROLE_META[r];
          return (
            <div key={r} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${m.bg} ${m.color} ${m.border}`}>
              <Shield size={10} />
              {m.label}
              <span className="opacity-70">× {roleGroups[r]}</span>
            </div>
          );
        })}
      </div>

      {/* User list */}
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <Users size={36} className="opacity-30" />
          <p>No users found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <UserRow key={u.id} user={u} onToggleActive={handleToggleActive} onRoleChange={handleRoleChange} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateUserModal onConfirm={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
