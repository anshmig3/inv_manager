import { useState } from 'react';
import { Shield, BarChart2, Zap } from 'lucide-react';
import AuditLogView from '../components/Intelligence/AuditLogView';
import WeeklyReport from '../components/Intelligence/WeeklyReport';
import AnomalyPanel from '../components/Intelligence/AnomalyPanel';

type IntelTab = 'audit' | 'report' | 'anomaly';

const TABS: { key: IntelTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'audit',   label: 'Audit Log',        icon: <Shield size={14} />,    color: 'slate' },
  { key: 'report',  label: 'Weekly Report',    icon: <BarChart2 size={14} />, color: 'violet' },
  { key: 'anomaly', label: 'Anomaly Detection',icon: <Zap size={14} />,       color: 'amber' },
];

const ACTIVE: Record<string, string> = {
  slate:  'bg-slate-600 text-white',
  violet: 'bg-violet-600 text-white',
  amber:  'bg-amber-600 text-white',
};

export default function IntelligencePage() {
  const [tab, setTab] = useState<IntelTab>('audit');

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Zap size={20} className="text-amber-400" />
        <h1 className="text-xl font-bold text-white">Intelligence</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? ACTIVE[t.color] : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'audit'   && <AuditLogView />}
      {tab === 'report'  && <WeeklyReport />}
      {tab === 'anomaly' && <AnomalyPanel />}
    </div>
  );
}
