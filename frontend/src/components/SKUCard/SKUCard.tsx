import { Tag, AlertTriangle, TrendingDown, Package } from 'lucide-react';
import type { SKUCard as SKUCardType, CardStatus } from '../../types';

interface Props {
  card: SKUCardType;
  onClick: () => void;
}

const statusConfig: Record<CardStatus, { border: string; bg: string; badge: string; badgeText: string }> = {
  CRITICAL: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    badge: 'bg-red-500 text-white',
    badgeText: 'CRITICAL',
  },
  WARNING: {
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    badge: 'bg-amber-400 text-white',
    badgeText: 'WARNING',
  },
  WATCH: {
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    badge: 'bg-yellow-300 text-yellow-900',
    badgeText: 'WATCH',
  },
  HEALTHY: {
    border: 'border-green-400',
    bg: 'bg-white',
    badge: 'bg-green-100 text-green-800',
    badgeText: 'HEALTHY',
  },
};

function DOSBar({ dos }: { dos: number }) {
  const pct = Math.min(100, (dos / 14) * 100);
  const color = dos <= 0 ? 'bg-red-500' : dos <= 3 ? 'bg-amber-400' : dos <= 5 ? 'bg-yellow-300' : 'bg-green-400';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>Days of Supply</span>
        <span className="font-semibold text-slate-700">{dos === 999 ? '∞' : dos.toFixed(1)}d</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SKUCard({ card, onClick }: Props) {
  const cfg = statusConfig[card.card_status];

  return (
    <button
      onClick={onClick}
      className={`
        text-left w-full rounded-xl border-2 p-4 shadow-sm transition-all duration-150
        hover:shadow-md hover:-translate-y-0.5 cursor-pointer
        ${cfg.border} ${cfg.bg}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-mono">{card.sku_code}</p>
          <h3 className="font-semibold text-sm text-slate-800 leading-tight truncate">{card.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{card.category}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
      </div>

      {/* Stock row */}
      <div className="flex gap-3 mt-3 text-sm">
        <div className="flex-1">
          <p className="text-xs text-slate-500">On Hand</p>
          <p className={`font-bold ${card.on_hand === 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {card.on_hand} <span className="text-xs font-normal text-slate-400">{card.unit}</span>
          </p>
        </div>
        {card.on_order > 0 && (
          <div className="flex-1">
            <p className="text-xs text-slate-500">On Order</p>
            <p className="font-semibold text-blue-600">
              {card.on_order} <span className="text-xs font-normal text-slate-400">{card.unit}</span>
            </p>
          </div>
        )}
      </div>

      <DOSBar dos={card.days_of_supply} />

      {/* Badges row */}
      <div className="flex flex-wrap gap-1 mt-3">
        {card.has_active_promo && (
          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
            <Tag size={10} /> PROMO
          </span>
        )}
        {card.days_until_expiry !== null && card.days_until_expiry <= 7 && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            card.days_until_expiry <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <AlertTriangle size={10} /> Exp {card.days_until_expiry}d
          </span>
        )}
        {card.on_hand <= card.reorder_point && card.on_hand > 0 && (
          <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
            <TrendingDown size={10} /> Low Stock
          </span>
        )}
        {card.on_hand === 0 && (
          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
            <Package size={10} /> Stockout
          </span>
        )}
      </div>

      {/* Alert count */}
      {card.active_alerts.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {card.active_alerts.length} active alert{card.active_alerts.length > 1 ? 's' : ''}
        </p>
      )}
    </button>
  );
}
