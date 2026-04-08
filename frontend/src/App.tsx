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
    <div className="min-h-screen bg-slate-100">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <ShoppingBag size={22} className="text-blue-600" />
            <span className="font-bold text-slate-800 text-base">GroceryIQ</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-1">
              Phase 1
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('inventory')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'inventory'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid size={15} />
              Inventory
            </button>
            <button
              onClick={() => setTab('chat')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'chat'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
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
