import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, RefreshCw, Moon, Check } from 'lucide-react';
import type { NotificationPref } from '../../types';
import { api } from '../../api/client';

const CHANNELS = [
  { key: 'EMAIL',   label: 'Email',    icon: <Mail size={15} /> },
  { key: 'IN_APP',  label: 'In-App',   icon: <Bell size={15} /> },
  { key: 'SMS',     label: 'SMS',      icon: <MessageSquare size={15} /> },
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

const SEV_META: Record<string, { color: string; dot: string }> = {
  CRITICAL: { color: 'text-red-400',    dot: 'bg-red-500' },
  HIGH:     { color: 'text-orange-400', dot: 'bg-orange-500' },
  MEDIUM:   { color: 'text-amber-400',  dot: 'bg-amber-500' },
  LOW:      { color: 'text-slate-400',  dot: 'bg-slate-500' },
};

const DIGEST_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'HOURLY',    label: 'Hourly digest' },
  { value: 'DAILY',     label: 'Daily digest' },
];

function fmt24h(h: number | null) {
  if (h == null) return '';
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${ampm}`;
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    api.getNotificationPrefs().then(p => { setPrefs(p); setLoading(false); });
  }, []);

  const getPref = (channel: string, severity: string) =>
    prefs.find(p => p.channel === channel && p.severity === severity);

  const update = async (pref: NotificationPref, patch: Partial<NotificationPref>) => {
    setSaving(pref.id);
    const updated = { ...pref, ...patch };
    setPrefs(ps => ps.map(p => (p.id === pref.id ? updated : p)));
    try {
      await api.updateNotificationPref(pref.id, patch);
      setSaved(pref.id);
      setTimeout(() => setSaved(null), 1500);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading preferences…
      </div>
    );
  }

  // Pick one pref per channel for quiet hours / digest (they share settings per channel)
  const channelSettings = CHANNELS.map(ch => ({
    ...ch,
    firstPref: prefs.find(p => p.channel === ch.key),
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Notification Preferences</h1>
        <p className="text-sm text-slate-400 mt-0.5">Control which alerts you receive and how.</p>
      </div>

      {/* Toggle matrix */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Alert Channels × Severity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Toggle which alert severities to receive on each channel.</p>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-3 text-xs text-slate-400 uppercase tracking-wider font-semibold w-24">Channel</th>
                  {SEVERITIES.map(sev => (
                    <th key={sev} className="pb-3 text-center">
                      <span className={`text-xs font-semibold ${SEV_META[sev].color}`}>{sev}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map(ch => (
                  <tr key={ch.key} className="border-t border-slate-700/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 text-slate-300 font-medium">
                        {ch.icon}
                        {ch.label}
                      </div>
                    </td>
                    {SEVERITIES.map(sev => {
                      const pref = getPref(ch.key, sev);
                      if (!pref) return <td key={sev} className="py-3 text-center text-slate-600">—</td>;
                      const isSaving = saving === pref.id;
                      const isSaved = saved === pref.id;
                      return (
                        <td key={sev} className="py-3 text-center">
                          <button
                            onClick={() => update(pref, { enabled: !pref.enabled })}
                            disabled={isSaving}
                            className={`w-9 h-5 rounded-full border transition-all relative ${
                              pref.enabled
                                ? 'bg-cyan-600 border-cyan-500'
                                : 'bg-slate-700 border-slate-600'
                            } disabled:opacity-60`}
                            title={pref.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${
                              pref.enabled ? 'left-4 bg-white' : 'left-0.5 bg-slate-400'
                            }`} />
                            {isSaved && <Check size={10} className="absolute inset-0 m-auto text-white" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Per-channel advanced settings */}
      <div className="space-y-4">
        {channelSettings.map(({ key, label, icon, firstPref }) => {
          if (!firstPref) return null;
          return (
            <div key={key} className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-slate-300">{icon}</div>
                <h3 className="text-sm font-semibold text-white">{label} Settings</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Digest frequency */}
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5">Delivery frequency</label>
                  <select
                    value={firstPref.digest_frequency}
                    onChange={e => {
                      const v = e.target.value;
                      // update all prefs for this channel
                      prefs.filter(p => p.channel === key).forEach(p => update(p, { digest_frequency: v }));
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {DIGEST_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Quiet hours start */}
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5">
                    <Moon size={11} className="inline mr-1" />
                    Quiet hours start
                  </label>
                  <select
                    value={firstPref.quiet_hours_start ?? ''}
                    onChange={e => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      prefs.filter(p => p.channel === key).forEach(p => update(p, { quiet_hours_start: v }));
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Off</option>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{fmt24h(i)}</option>
                    ))}
                  </select>
                </div>

                {/* Quiet hours end */}
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5">
                    Quiet hours end
                  </label>
                  <select
                    value={firstPref.quiet_hours_end ?? ''}
                    onChange={e => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      prefs.filter(p => p.channel === key).forEach(p => update(p, { quiet_hours_end: v }));
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Off</option>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{fmt24h(i)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Override quiet for critical */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    prefs.filter(p => p.channel === key).forEach(p =>
                      update(p, { override_quiet_for_critical: !firstPref.override_quiet_for_critical })
                    );
                  }}
                  className={`w-9 h-5 rounded-full border transition-all relative ${
                    firstPref.override_quiet_for_critical
                      ? 'bg-red-600 border-red-500'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${
                    firstPref.override_quiet_for_critical ? 'left-4 bg-white' : 'left-0.5 bg-slate-400'
                  }`} />
                </button>
                <div>
                  <p className="text-xs font-medium text-white">Override quiet hours for CRITICAL alerts</p>
                  <p className="text-xs text-slate-500">Always deliver critical alerts regardless of quiet hours</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
