import { useState } from 'react';
import { Trash2, ArrowLeftRight, TruckIcon, BarChart3, Users as UsersIcon } from 'lucide-react';
import DisposalLog from '../components/Operations/DisposalLog';
import StockTransfers from '../components/Operations/StockTransfers';
import DeliveryCalendar from '../components/Operations/DeliveryCalendar';
import SupplierManagement from '../components/Operations/SupplierManagement';

type OpsTab = 'disposals' | 'transfers' | 'deliveries' | 'suppliers';

const TABS: { key: OpsTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'disposals',  label: 'Disposals',   icon: <Trash2 size={14} />,       color: 'red' },
  { key: 'transfers',  label: 'Transfers',   icon: <ArrowLeftRight size={14} />,color: 'violet' },
  { key: 'deliveries', label: 'Deliveries',  icon: <TruckIcon size={14} />,    color: 'cyan' },
  { key: 'suppliers',  label: 'Suppliers',   icon: <UsersIcon size={14} />,    color: 'amber' },
];

const ACTIVE: Record<string, string> = {
  red:    'bg-red-600 text-white',
  violet: 'bg-violet-600 text-white',
  cyan:   'bg-cyan-600 text-white',
  amber:  'bg-amber-600 text-white',
};

export default function OperationsPage() {
  const [tab, setTab] = useState<OpsTab>('disposals');

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={20} className="text-cyan-400" />
        <h1 className="text-xl font-bold text-white">Operations</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? ACTIVE[t.color] : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'disposals'  && <DisposalLog />}
      {tab === 'transfers'  && <StockTransfers />}
      {tab === 'deliveries' && <DeliveryCalendar />}
      {tab === 'suppliers'  && <SupplierManagement />}
    </div>
  );
}
