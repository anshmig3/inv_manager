import { useState } from 'react';
import { LayoutGrid, MessageSquare, ShoppingBag, LogOut, User, Bell, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import InventoryPage from './pages/InventoryPage';
import ChatPage from './pages/ChatPage';
import AlertsPage from './pages/AlertsPage';
import NotificationPreferences from './components/Settings/NotificationPreferences';
import UserManagement from './components/Settings/UserManagement';

type Tab = 'inventory' | 'chat' | 'alerts' | 'notifications' | 'users';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:         { label: 'Admin',       color: 'text-red-400 bg-red-950/50 border-red-700' },
  STORE_MANAGER: { label: 'Manager',     color: 'text-cyan-400 bg-cyan-950/50 border-cyan-700' },
  DEPT_HEAD:     { label: 'Dept Head',   color: 'text-amber-400 bg-amber-950/50 border-amber-700' },
  FLOOR_STAFF:   { label: 'Floor Staff', color: 'text-slate-400 bg-slate-700 border-slate-600' },
  READ_ONLY:     { label: 'Read Only',   color: 'text-slate-400 bg-slate-700 border-slate-600' },
};

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('inventory');
  const [chatSeed, setChatSeed] = useState<string | undefined>();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!isAuthenticated) return <LoginPage />;

  const handleAskAI = (msg: string) => {
    setChatSeed(msg);
    setTab('chat');
  };

  const roleMeta = user ? (ROLE_LABELS[user.role] ?? ROLE_LABELS.READ_ONLY) : ROLE_LABELS.READ_ONLY;
  const canManageUsers = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Nav */}
      <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Left: Logo + tabs */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag size={22} className="text-cyan-400" />
              <span className="font-bold text-white text-base tracking-wide">GroceryIQ</span>
              <span className="text-xs bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded-full font-semibold ml-1">
                Phase 1
              </span>
            </div>
            <div className="flex gap-1">
              <NavBtn active={tab === 'inventory'} onClick={() => setTab('inventory')} color="cyan">
                <LayoutGrid size={15} /> Inventory
              </NavBtn>
              <NavBtn active={tab === 'chat'} onClick={() => setTab('chat')} color="violet">
                <MessageSquare size={15} /> Ask AI
              </NavBtn>
              <NavBtn active={tab === 'alerts'} onClick={() => setTab('alerts')} color="amber">
                <AlertTriangle size={15} /> Alerts
              </NavBtn>
              {canManageUsers && (
                <NavBtn active={tab === 'users'} onClick={() => setTab('users')} color="slate">
                  <Users size={15} /> Users
                </NavBtn>
              )}
            </div>
          </div>

          {/* Right: User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
                <User size={14} className="text-slate-300" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-white leading-none">{user?.full_name}</p>
                <p className="text-xs text-slate-400">{user?.department ?? 'All Departments'}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border hidden sm:inline ${roleMeta.color}`}>
                {roleMeta.label}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-xs font-semibold text-white">{user?.full_name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setTab('notifications'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Bell size={14} /> Notification Prefs
                </button>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/50 transition-colors border-t border-slate-700"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Overlay to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'inventory'     && <InventoryPage onAskAI={handleAskAI} />}
        {tab === 'chat'          && <ChatPage initialMessage={chatSeed} />}
        {tab === 'alerts'        && <AlertsPage />}
        {tab === 'notifications' && <NotificationPreferences />}
        {tab === 'users'         && canManageUsers && <UserManagement />}
      </main>
    </div>
  );
}

function NavBtn({
  active, onClick, color, children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  const activeClasses: Record<string, string> = {
    cyan:   'bg-cyan-600 text-white',
    violet: 'bg-violet-600 text-white',
    amber:  'bg-amber-600 text-white',
    slate:  'bg-slate-600 text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? activeClasses[color] : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
