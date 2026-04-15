import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { api } from '../../api/client';

interface Props {
  initialMessage?: string;
  onClose?: () => void;
}

export default function ChatInterface({ initialMessage }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialMessage ?? '');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message) return;

    const userMsg: ChatMessage = { role: 'user', content: message };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat(message, history);
      setHistory([...newHistory, { role: 'assistant', content: res.reply }]);
    } catch {
      setHistory([...newHistory, {
        role: 'assistant',
        content: 'Sorry, I could not reach the inventory service. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What should I order today?',
    'Which items are expiring this week?',
    'Show me all stockouts',
    'What items are on promo with low stock?',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700 bg-slate-900">
        <div className="w-8 h-8 rounded-full bg-cyan-600/30 border border-cyan-500 flex items-center justify-center">
          <Bot size={18} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Inventory AI Assistant</h2>
          <p className="text-xs text-slate-400">Ask me anything about your stock</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {history.length === 0 && (
          <div className="text-center py-8">
            <Bot size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 mb-4">Ask me about your inventory, or try one of these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-cyan-700 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-cyan-600' : 'bg-slate-700 border border-slate-600'
            }`}>
              {msg.role === 'user'
                ? <User size={14} className="text-white" />
                : <Bot size={14} className="text-cyan-400" />
              }
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-cyan-600 text-white rounded-tr-sm'
                : 'bg-slate-700 text-slate-100 rounded-tl-sm border border-slate-600'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-cyan-400" />
            </div>
            <div className="bg-slate-700 border border-slate-600 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-cyan-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about inventory…"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm border border-slate-600 rounded-xl bg-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
