'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/lib/api/admin';
import { Radar, Wallet, Bus, Bot, CheckCircle, Bell, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const AGENTS = [
  { id: 'dispatch' as const, label: 'Dispatch Agent', icon: Radar, blurb: 'Driver assignment, occupancy, delays' },
  { id: 'finance' as const, label: 'Finance Agent', icon: Wallet, blurb: 'Revenue trend, cancels, COD exposure' },
  { id: 'fleet' as const, label: 'Fleet Agent', icon: Bus, blurb: 'Idle buses, expiring compliance' },
];

const SEV_ICON = { critical: AlertCircle, warning: AlertTriangle, info: Info } as const;
const SEV_STYLE = {
  critical: 'border-l-red-500 bg-red-50/40', warning: 'border-l-amber-500 bg-amber-50/40', info: 'border-l-blue-400 bg-blue-50/30',
} as const;

/** Department AI Agents: each analyzes live data and can act via the engines. */
export function AgentsConsole() {
  const [active, setActive] = useState<'dispatch' | 'finance' | 'fleet'>('dispatch');
  const { data: overview } = useQuery({ queryKey: ['agents-overview'], queryFn: agentsApi.overview });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <Bot size={20} className="text-indigo-600" />
        <div>
          <div className="font-semibold">Department Agents</div>
          <div className="text-xs text-gray-500">Each agent scans your live operation and recommends actions.</div>
        </div>
      </div>

      {/* Agent selector cards with severity badges */}
      <div className="grid md:grid-cols-3 gap-3">
        {AGENTS.map(({ id, label, icon: Icon, blurb }) => {
          const o = (overview as any)?.[id];
          return (
            <button key={id} onClick={() => setActive(id)}
              className={`text-left border rounded-xl p-4 transition-all ${active === id ? 'border-indigo-300 ring-2 ring-indigo-100 bg-white' : 'border-slate-200 hover:border-indigo-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <Icon size={18} className="text-indigo-600" />
                <div className="flex gap-1">
                  {o?.critical > 0 && <span className="text-[11px] bg-red-100 text-red-700 rounded-full px-2 py-0.5">{o.critical} critical</span>}
                  {o?.warning > 0 && <span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{o.warning} warn</span>}
                  {o && o.total === 0 && <span className="text-[11px] bg-green-100 text-green-700 rounded-full px-2 py-0.5">clear</span>}
                </div>
              </div>
              <div className="font-medium text-sm mt-2">{label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{blurb}</div>
            </button>
          );
        })}
      </div>

      <AgentInsights domain={active} />
    </div>
  );
}

function AgentInsights({ domain }: { domain: 'dispatch' | 'finance' | 'fleet' }) {
  const qc = useQueryClient();
  const { data: insights = [], isLoading } = useQuery({ queryKey: ['agent', domain], queryFn: () => agentsApi.run(domain) });
  const [acted, setActed] = useState<Record<string, boolean>>({});

  const act = useMutation({
    mutationFn: ({ action }: any) => agentsApi.act(action, domain),
    onSuccess: (_r, vars: any) => {
      setActed((a) => ({ ...a, [vars.id]: true }));
      qc.invalidateQueries({ queryKey: ['automation-alerts'] });
      qc.invalidateQueries({ queryKey: ['agents-overview'] });
    },
  });

  if (isLoading) return <div className="card text-center py-10 text-slate-400 text-sm">Agent scanning…</div>;

  return (
    <div className="space-y-2.5">
      {insights.map((i: any) => {
        const SevIcon = SEV_ICON[i.severity as keyof typeof SEV_ICON] || Info;
        const ok = i.id.endsWith('-ok');
        return (
          <div key={i.id} className={`card border-l-4 ${ok ? 'border-l-green-500 bg-green-50/40' : SEV_STYLE[i.severity as keyof typeof SEV_STYLE]} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5">
                {ok ? <CheckCircle size={17} className="text-green-500 mt-0.5 shrink-0" /> : <SevIcon size={17} className={`mt-0.5 shrink-0 ${i.severity === 'critical' ? 'text-red-500' : i.severity === 'warning' ? 'text-amber-500' : 'text-blue-400'}`} />}
                <div>
                  <div className="font-medium text-sm text-gray-800">{i.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{i.detail}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {i.metric && <span className="text-sm font-semibold text-gray-700">{i.metric}</span>}
                {i.action && (
                  acted[i.id]
                    ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={13} /> Alerted</span>
                    : <button onClick={() => act.mutate({ id: i.id, action: i.action })} disabled={act.isPending}
                        className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-40">
                        <Bell size={12} /> Create alert
                      </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
