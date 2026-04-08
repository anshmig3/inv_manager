import { useState, useEffect, useCallback } from 'react';
import type { SKUCard as SKUCardType, SKUDetail, DashboardOut } from '../types';
import { api } from '../api/client';
import DashboardSummary from '../components/Dashboard/DashboardSummary';
import SKUFilters, { type FilterState } from '../components/Filters/SKUFilters';
import SKUCard from '../components/SKUCard/SKUCard';
import SKUDetailPanel from '../components/SKUCard/SKUDetailPanel';

interface Props {
  onAskAI: (msg: string) => void;
}

export default function InventoryPage({ onAskAI }: Props) {
  const [cards, setCards] = useState<SKUCardType[]>([]);
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SKUDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    status: '',
    promo: '',
    sortBy: 'status',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sort_by: filters.sortBy };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.promo) params.promo = filters.promo;

      const [c, d, cats] = await Promise.all([
        api.getSKUs(params),
        api.getDashboard(),
        api.getCategories(),
      ]);
      setCards(c);
      setDashboard(d);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    const d = await api.getSKUDetail(id);
    setDetail(d);
  };

  const closeDetail = () => { setSelectedId(null); setDetail(null); };

  const handleAskAI = (sku: SKUDetail) => {
    closeDetail();
    onAskAI(`Tell me about ${sku.name} (${sku.sku_code}). Current status: ${sku.card_status}. What should I do?`);
  };

  return (
    <div>
      {dashboard && (
        <DashboardSummary data={dashboard} onRefresh={fetchData} loading={loading} />
      )}

      <SKUFilters filters={filters} categories={categories} onChange={setFilters} />

      {loading && cards.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          Loading inventory…
        </div>
      ) : cards.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          No SKUs match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(card => (
            <SKUCard key={card.id} card={card} onClick={() => openDetail(card.id)} />
          ))}
        </div>
      )}

      {detail && (
        <SKUDetailPanel detail={detail} onClose={closeDetail} onAskAI={handleAskAI} />
      )}
    </div>
  );
}
