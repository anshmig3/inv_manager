import { Tag, AlertTriangle, TrendingDown, Package } from 'lucide-react';
import type { SKUCard as SKUCardType, CardStatus } from '../../types';

interface Props {
  card: SKUCardType;
  onClick: () => void;
}

const statusConfig: Record<CardStatus, {
  border: string;
  bg: string;
  badge: string;
  badgeText: string;
  skuCodeColor: string;
}> = {
  CRITICAL: {
    border: 'border-red-500',
    bg: 'bg-red-950/40',
    badge: 'bg-red-500 text-white',
    badgeText: 'CRITICAL',
    skuCodeColor: 'text-red-400',
  },
  WARNING: {
    border: 'border-amber-500',
    bg: 'bg-amber-950/40',
    badge: 'bg-amber-500 text-white',
    badgeText: 'WARNING',
    skuCodeColor: 'text-amber-400',
  },
  WATCH: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-950/30',
    badge: 'bg-yellow-500 text-slate-900',
    badgeText: 'WATCH',
    skuCodeColor: 'text-yellow-400',
  },
  HEALTHY: {
    border: 'border-emerald-600',
    bg: 'bg-slate-800',
    badge: 'bg-emerald-600 text-white',
    badgeText: 'HEALTHY',
    skuCodeColor: 'text-emerald-400',
  },
};

function DOSBar({ dos }: { dos: number }) {
  const pct = Math.min(100, (dos / 14) * 100);
  const color = dos <= 0 ? 'bg-red-500' : dos <= 3 ? 'bg-amber-400' : dos <= 5 ? 'bg-yellow-400' : 'bg-emerald-400';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
        <span>Days of Supply</span>
        <span className="font-semibold text-slate-200">{dos === 999 ? '∞' : dos.toFixed(1)}d</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
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
        text-left w-full rounded-xl border-2 p-4 shadow-lg transition-all duration-150
        hover:shadow-xl hover:-translate-y-0.5 cursor-pointer
        ${cfg.border} ${cfg.bg}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-mono font-semibold ${cfg.skuCodeColor}`}>{card.sku_code}</p>
          <h3 className="font-semibold text-sm text-slate-100 leading-tight truncate">{card.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{card.category}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
      </div>

      {/* Stock row */}
      <div className="flex gap-3 mt-3 text-sm">
        <div className="flex-1">
          <p className="text-xs text-slate-500">On Hand</p>
          <p className={`font-bold ${card.on_hand === 0 ? 'text-red-400' : 'text-slate-100'}`}>
            {card.on_hand} <span className="text-xs font-normal text-slate-500">{card.unit}</span>
          </p>
        </div>
        {card.on_order > 0 && (
          <div className="flex-1">
            <p className="text-xs text-slate-500">On Order</p>
            <p className="font-semibold text-cyan-400">
              {card.on_order} <span className="text-xs font-normal text-slate-500">{card.unit}</span>
            </p>
          </div>
        )}
      </div>

      <DOSBar dos={card.days_of_supply} />

      {/* Badges row */}
      <div className="flex flex-wrap gap-1 mt-3">
        {card.has_active_promo && (
          <span className="flex items-center gap-1 text-xs bg-violet-900/60 text-violet-300 font-semibold px-2 py-0.5 rounded-full border border-violet-700">
            <Tag size={10} /> PROMO
          </span>
        )}
        {card.days_until_expiry !== null && card.days_until_expiry <= 7 && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
            card.days_until_expiry <= 3
              ? 'bg-red-900/60 text-red-300 border-red-700'
              : 'bg-amber-900/60 text-amber-300 border-amber-700'
          }`}>
            <AlertTriangle size={10} /> Exp {card.days_until_expiry}d
          </span>
        )}
        {card.on_hand <= card.reorder_point && card.on_hand > 0 && (
          <span className="flex items-center gap-1 text-xs bg-orange-900/60 text-orange-300 font-semibold px-2 py-0.5 rounded-full border border-orange-700">
            <TrendingDown size={10} /> Low Stock
          </span>
        )}
        {card.on_hand === 0 && (
          <span className="flex items-center gap-1 text-xs bg-red-900/60 text-red-300 font-semibold px-2 py-0.5 rounded-full border border-red-700">
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
