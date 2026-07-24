'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operatorApi } from '@/lib/api/operator';
import { Radio, AlertTriangle, Bus, Clock, Users, Navigation, Zap } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700', BOARDING: 'bg-yellow-50 text-yellow-700', DEPARTED: 'bg-orange-50 text-orange-700',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-700', ARRIVED: 'bg-green-50 text-green-700', DELAYED: 'bg-amber-50 text-amber-700', CANCELLED: 'bg-red-50 text-red-600',
};
const SEV_DOT: Record<string, string> = { critical: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-400' };

/** Dispatcher Console — live-ops board (auto-refreshes). */
export function DispatchBoard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['dispatch-board'], queryFn: operatorApi.dispatchBoard, refetchInterval: 20000 });
  const decide = useMutation({ mutationFn: (tripId: string) => operatorApi.dispatchDecision(tripId), onSuccess: () => qc.invalidateQueries({ queryKey: ['dispatch-board'] }) });

  const s = (data as any)?.summary;
  const trips: any[] = (data as any)?.trips ?? [];
  const alerts: any[] = (data as any)?.alerts ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <Radio size={20} className="text-orange-600" />
        <div>
          <div className="font-semibold">Dispatch Control</div>
          <div className="text-xs text-gray-500">Today’s operations — live (refreshes every 20s).</div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Trips today', value: s?.total ?? 0, icon: Bus, c: 'text-slate-700' },
          { label: 'En route', value: s?.enRoute ?? 0, icon: Navigation, c: 'text-indigo-600' },
          { label: 'Unassigned', value: s?.unassigned ?? 0, icon: Users, c: 'text-red-600' },
          { label: 'Delayed', value: s?.delayed ?? 0, icon: Clock, c: 'text-amber-600' },
          { label: 'Critical alerts', value: s?.criticalAlerts ?? 0, icon: AlertTriangle, c: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className="card text-center py-3">
            <k.icon size={16} className={`mx-auto ${k.c}`} />
            <div className={`text-2xl font-bold mt-1 ${k.c}`}>{k.value}</div>
            <div className="text-xs text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Trips board */}
        <div className="lg:col-span-2 card overflow-hidden p-0">
          <div className="px-4 py-3 border-b font-semibold text-gray-800">Today’s trips ({trips.length})</div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {trips.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">No trips today.</div>}
            {trips.map((t) => (
              <div key={t.tripId} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    {t.route}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[t.status] ?? 'bg-slate-100'}`}>{t.status}</span>
                    {t.unassigned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">no driver</span>}
                    {t.delayMinutes > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">+{t.delayMinutes}m</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.bus} · {new Date(t.departureTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} · {t.occupancy}% full ({t.booked}/{t.total})
                  </div>
                </div>
                {['DELAYED', 'DEPARTED', 'BOARDING', 'IN_TRANSIT'].includes(t.status) && (
                  <button onClick={() => decide.mutate(t.tripId)} disabled={decide.isPending}
                    className="text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0 disabled:opacity-50"><Zap size={12} /> AI</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live alert feed */}
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b font-semibold text-gray-800 flex items-center gap-2"><AlertTriangle size={15} /> Live alerts</div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {alerts.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">All clear.</div>}
            {alerts.map((a) => (
              <div key={a.id} className="px-4 py-2.5">
                <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[a.severity] ?? SEV_DOT.info}`} />{a.title}
                </div>
                {a.message && <div className="text-xs text-slate-500 mt-0.5 ml-3.5 line-clamp-2">{a.message}</div>}
                <div className="text-[10px] text-slate-400 mt-0.5 ml-3.5">{a.source || 'system'} · {new Date(a.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
