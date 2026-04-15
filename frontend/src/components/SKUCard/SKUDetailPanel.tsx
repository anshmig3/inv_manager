import { X, ShoppingCart, FileText, CheckCircle, MessageSquare, AlertTriangle, Package, Tag } from 'lucide-react';
import { useState } from 'react';
import type { SKUDetail, CardStatus } from '../../types';
import { api } from '../../api/client';

interface Props {
  detail: SKUDetail;
  onClose: () => void;
  onAskAI: (sku: SKUDetail) => void;
}

const statusColors: Record<CardStatus, string> = {
  CRITICAL: 'text-red-400 bg-red-950/50 border-red-700',
  WARNING: 'text-amber-400 bg-amber-950/50 border-amber-700',
  WATCH: 'text-yellow-400 bg-yellow-950/50 border-yellow-700',
  HEALTHY: 'text-emerald-400 bg-emerald-950/50 border-emerald-700',
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold text-slate-100 text-sm">
        {value}{sub && <span className="font-normal text-slate-500 text-xs ml-1">{sub}</span>}
      </p>
    </div>
  );
}

export default function SKUDetailPanel({ detail, onClose, onAskAI }: Props) {
  const [draftingPO, setDraftingPO] = useState(false);
  const [poCreated, setPOCreated] = useState(false);

  const handleDraftPO = async () => {
    setDraftingPO(true);
    try {
      await api.createPO(detail.id, detail.reorder_qty);
      setPOCreated(true);
    } finally {
      setDraftingPO(false);
    }
  };

  const statusCls = statusColors[detail.card_status];
  const dos = detail.days_of_supply;
  const dosStr = dos === 999 ? '∞' : dos.toFixed(1);
  const dosAfterStr = detail.days_of_supply_after_order === 999 ? '∞' : detail.days_of_supply_after_order.toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700">
          <div>
            <p className="text-xs text-slate-500 font-mono">{detail.sku_code}</p>
            <h2 className="text-lg font-bold text-white">{detail.name}</h2>
            <p className="text-sm text-slate-400">{detail.category}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusCls}`}>
              {detail.card_status}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* Active Alerts */}
          {detail.active_alerts.length > 0 && (
            <div className="space-y-2">
              {detail.active_alerts.map(a => (
                <div key={a.id} className={`flex gap-2 p-3 rounded-lg border text-sm ${
                  a.severity === 'CRITICAL' ? 'bg-red-950/50 border-red-800 text-red-300' :
                  a.severity === 'HIGH' ? 'bg-amber-950/50 border-amber-800 text-amber-300' :
                  'bg-yellow-950/50 border-yellow-800 text-yellow-300'
                }`}>
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stock + Days of Supply */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Stock</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-slate-900/50 rounded-xl p-4">
              <Stat label="On Hand" value={`${detail.stock.on_hand} ${detail.unit}`} />
              <Stat label="On Order" value={`${detail.stock.on_order} ${detail.unit}`} />
              <Stat label="Reorder Point" value={`${detail.reorder_point} ${detail.unit}`} />
              <Stat label="Reorder Qty" value={`${detail.reorder_qty} ${detail.unit}`} />
              <Stat label="Days of Supply (current)" value={`${dosStr}d`} />
              <Stat label="Days of Supply (after PO)" value={`${dosAfterStr}d`} />
            </div>
          </section>

          {/* Sales */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sales</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Daily Avg</p>
                <p className="text-2xl font-bold text-cyan-400">{detail.sales_stats.daily_avg}</p>
                <p className="text-xs text-slate-500">{detail.unit}/day</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Weekly</p>
                <p className="text-2xl font-bold text-cyan-400">{detail.sales_stats.weekly_total}</p>
                <p className="text-xs text-slate-500">{detail.unit}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Last 30 days</p>
                <p className="text-2xl font-bold text-cyan-400">{detail.sales_stats.monthly_total}</p>
                <p className="text-xs text-slate-500">{detail.unit}</p>
              </div>
            </div>
          </section>

          {/* Promotions */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Promotion</h3>
            {detail.promotions.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-900/50 rounded-xl p-3">
                <Tag size={14} />
                <span>No active or upcoming promotions</span>
              </div>
            ) : (
              <div className="space-y-2">
                {detail.promotions.map(p => (
                  <div key={p.id} className="bg-violet-950/40 border border-violet-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={14} className="text-violet-400" />
                      <span className="font-semibold text-violet-300">{p.promo_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <Stat label="On Promo" value="YES" />
                      <Stat label="Start Date" value={p.start_date} />
                      <Stat label="End Date" value={p.end_date} />
                      <Stat label="Expected Uplift" value={`+${p.expected_uplift_pct}%`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Expiry */}
          {detail.expiry_batches.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Expiry</h3>
              <div className="space-y-2">
                {detail.expiry_batches.map(b => (
                  <div key={b.id} className={`flex items-center justify-between rounded-xl p-3 text-sm border ${
                    b.days_until_expiry <= 3 ? 'bg-red-950/50 border-red-800' :
                    b.days_until_expiry <= 7 ? 'bg-amber-950/50 border-amber-800' :
                    'bg-slate-900/50 border-slate-700'
                  }`}>
                    <div>
                      <p className="font-mono text-xs text-slate-500">{b.batch_number}</p>
                      <p className="font-semibold text-slate-200">{b.quantity} {detail.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Expires</p>
                      <p className="font-semibold text-slate-200">{b.expiry_date}</p>
                      <p className={`text-xs font-bold ${
                        b.days_until_expiry <= 3 ? 'text-red-400' :
                        b.days_until_expiry <= 7 ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        in {b.days_until_expiry} day{b.days_until_expiry !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Supplier */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Supplier</h3>
            <div className="bg-slate-900/50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Supplier" value={detail.supplier_name} />
              <Stat label="Lead Time" value={`${detail.lead_time_days} days`} />
              <Stat label="Unit Cost" value={`£${detail.unit_cost.toFixed(2)}`} />
              <Stat label="Contact" value={detail.supplier_email} />
            </div>
          </section>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 p-5 border-t border-slate-700 bg-slate-900/50 rounded-b-2xl">
          <button
            onClick={handleDraftPO}
            disabled={draftingPO || poCreated}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60 transition-colors"
          >
            {poCreated ? <CheckCircle size={15} /> : <FileText size={15} />}
            {poCreated ? 'PO Created' : draftingPO ? 'Creating…' : 'Draft PO'}
          </button>

          <button
            onClick={handleDraftPO}
            disabled={draftingPO || poCreated}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            <ShoppingCart size={15} />
            Request Stock Increase
          </button>

          <button
            onClick={() => onAskAI(detail)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <MessageSquare size={15} />
            Ask AI
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Package size={15} />
            Mark as Reviewed
          </button>
        </div>
      </div>
    </div>
  );
}
