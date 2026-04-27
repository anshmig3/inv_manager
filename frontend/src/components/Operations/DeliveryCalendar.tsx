import { useState, useEffect, useCallback } from 'react';
import { TruckIcon, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';

interface DeliveryEntry {
  po_id: number; po_number: string; sku_name: string; supplier_name: string;
  quantity: number; total_cost: number; status: string; expected_delivery: string;
  received_at: string | null;
}

interface CalendarData {
  calendar: Record<string, DeliveryEntry[]>;
  total_deliveries: number;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT:              'bg-slate-700 text-slate-300',
  APPROVED:           'bg-blue-950 text-blue-400 border border-blue-700',
  SENT:               'bg-cyan-950 text-cyan-400 border border-cyan-700',
  IN_TRANSIT:         'bg-violet-950 text-violet-400 border border-violet-700',
  RECEIVED:           'bg-emerald-950 text-emerald-400 border border-emerald-700',
  PARTIALLY_RECEIVED: 'bg-amber-950 text-amber-400 border border-amber-700',
};

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function DeliveryCalendar() {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d;
  });
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = toISO(weekStart);
    const to = toISO(addDays(weekStart, 13));
    try {
      setData((await api.getDeliveryCalendar({ date_from: from, date_to: to })) as unknown as CalendarData);
    } finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  const today = toISO(new Date());

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{data?.total_deliveries ?? 0} deliveries in next 14 days</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.slice(0, 7).map(day => {
          const key = toISO(day);
          const entries = data?.calendar[key] ?? [];
          const isToday = key === today;
          return (
            <div key={key} className={`rounded-xl border p-2 min-h-[120px] ${isToday ? 'border-cyan-600 bg-cyan-950/20' : 'border-slate-700 bg-slate-800'}`}>
              <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-cyan-400' : 'text-slate-400'}`}>
                {day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {entries.length === 0 ? (
                <p className="text-xs text-slate-600 text-center mt-4">—</p>
              ) : (
                <div className="space-y-1.5">
                  {entries.map(e => (
                    <div key={e.po_id} className="bg-slate-700/60 rounded-lg p-1.5">
                      <p className="text-xs font-medium text-white leading-tight truncate">{e.sku_name}</p>
                      <p className="text-xs text-slate-400 truncate">{e.supplier_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLOR[e.status] ?? STATUS_COLOR.DRAFT}`}>
                        {e.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week 2 */}
      <div className="grid grid-cols-7 gap-2 mt-2">
        {days.slice(7, 14).map(day => {
          const key = toISO(day);
          const entries = data?.calendar[key] ?? [];
          const isToday = key === today;
          return (
            <div key={key} className={`rounded-xl border p-2 min-h-[120px] ${isToday ? 'border-cyan-600 bg-cyan-950/20' : 'border-slate-700 bg-slate-800'}`}>
              <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-cyan-400' : 'text-slate-400'}`}>
                {day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {entries.length === 0 ? (
                <p className="text-xs text-slate-600 text-center mt-4">—</p>
              ) : (
                <div className="space-y-1.5">
                  {entries.map(e => (
                    <div key={e.po_id} className="bg-slate-700/60 rounded-lg p-1.5">
                      <p className="text-xs font-medium text-white leading-tight truncate">{e.sku_name}</p>
                      <p className="text-xs text-slate-400 truncate">{e.supplier_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLOR[e.status] ?? STATUS_COLOR.DRAFT}`}>
                        {e.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <TruckIcon size={16} className="mr-2 animate-bounce" /> Loading deliveries…
        </div>
      )}
    </div>
  );
}
