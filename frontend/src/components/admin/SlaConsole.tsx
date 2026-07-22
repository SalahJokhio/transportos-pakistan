'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slaApi } from '@/lib/api/admin';
import { Timer, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const STATE_STYLE: Record<string, string> = {
  OK: 'bg-green-50 text-green-700', AT_RISK: 'bg-amber-50 text-amber-700', BREACHED: 'bg-red-50 text-red-600',
};

/** SLA + Escalation Engine: live SLA state on open tickets + escalation feed. */
export function SlaConsole() {
  const qc = useQueryClient();
  const { data: status = [] } = useQuery({ queryKey: ['sla-status'], queryFn: slaApi.status });
  const { data: escalations = [] } = useQuery({ queryKey: ['sla-escalations'], queryFn: slaApi.escalations });
  const { data: config } = useQuery({ queryKey: ['sla-config'], queryFn: slaApi.config });

  const run = useMutation({
    mutationFn: () => slaApi.runNow(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sla-status'] }); qc.invalidateQueries({ queryKey: ['sla-escalations'] }); qc.invalidateQueries({ queryKey: ['automation-alerts'] }); },
  });

  const breached = status.filter((s: any) => s.state === 'BREACHED').length;
  const atRisk = status.filter((s: any) => s.state === 'AT_RISK').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <Timer size={20} className="text-orange-600" />
          <div>
            <div className="font-semibold">SLA & Escalation</div>
            <div className="text-xs text-gray-500">Breaches emit <code>SLA_BREACHED</code> + auto-escalate. Monitor runs every 10 min.</div>
          </div>
        </div>
        <button onClick={() => run.mutate()} disabled={run.isPending}
          className="text-sm flex items-center gap-1.5 border border-orange-200 text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg disabled:opacity-50">
          <RefreshCw size={14} className={run.isPending ? 'animate-spin' : ''} /> Run monitor now
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Breached', breached, 'text-red-600'], ['At risk', atRisk, 'text-amber-600'], ['Open tracked', status.length, 'text-slate-700']].map(([l, v, c]) => (
          <div key={l as string} className="card text-center py-3">
            <div className={`text-2xl font-bold ${c}`}>{v as number}</div>
            <div className="text-xs text-slate-500">{l as string}</div>
          </div>
        ))}
      </div>

      {config && (
        <div className="text-xs text-slate-500 flex flex-wrap gap-2">
          {Object.entries(config).map(([tier, v]: any) => (
            <span key={tier} className="bg-slate-50 border rounded px-2 py-1">{tier}: respond {v.response}h / resolve {v.resolve}h</span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-gray-800 flex items-center gap-2"><Clock size={16} /> Open tickets — SLA state</div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {status.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">No open tickets.</div>}
            {status.map((s: any) => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.subject}</div>
                  <div className="text-xs text-slate-500">{s.priority} · {s.ageHours}h old · target {s.target}h {s.responded ? '(resolve)' : '(response)'}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STATE_STYLE[s.state]}`}>{s.state}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-gray-800 flex items-center gap-2"><AlertTriangle size={16} /> Escalations</div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {escalations.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-1"><CheckCircle size={20} className="text-green-400" /> No escalations.</div>}
            {escalations.map((e: any) => (
              <div key={e.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Level {e.level} escalation</span>
                  <span className="text-[11px] text-slate-400">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500">{e.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
