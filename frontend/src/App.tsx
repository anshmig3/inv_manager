import { useState } from 'react';
import { LayoutGrid, MessageSquare, ShoppingBag } from 'lucide-react';
import InventoryPage from './pages/InventoryPage';
import ChatPage from './pages/ChatPage';

type Tab = 'inventory' | 'chat';

export default function App() {
  const [tab, setTab] = useState<Tab>('inventory');
  const [chatSeed, setChatSeed] = useState<string | undefined>();

  const handleAskAI = (msg: string) => {
    setChatSeed(msg);
    setTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Nav */}
      <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <ShoppingBag size={22} className="text-cyan-400" />
            <span className="font-bold text-white text-base tracking-wide">GroceryIQ</span>
            <span className="text-xs bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded-full font-semibold ml-1">
              Phase 1
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('inventory')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'inventory'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutGrid size={15} />
              Inventory
            </button>
            <button
              onClick={() => setTab('chat')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'chat'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare size={15} />
              Ask AI
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'inventory' && <InventoryPage onAskAI={handleAskAI} />}
        {tab === 'chat' && <ChatPage initialMessage={chatSeed} />}
      </main>
    </div>
  );
}
