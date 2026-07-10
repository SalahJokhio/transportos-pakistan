'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operatorApi } from '@/lib/api/operator';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { User, Star, ShieldCheck, Route } from 'lucide-react';

export default function DriversPage() {
  const qc = useQueryClient();
  const { data: drivers, isLoading, error } = useQuery({ queryKey: ['op-drivers'], queryFn: () => operatorApi.drivers() });
  const { data: trips } = useQuery({ queryKey: ['op-trips'], queryFn: () => operatorApi.getTrips() });

  const assign = useMutation({
    mutationFn: ({ tripId, driverId }: { tripId: string; driverId: string }) => operatorApi.assignDriver(tripId, driverId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-trips'] }),
  });

  if (error) return <><OperatorNav /><div className="max-w-5xl mx-auto px-4 py-16 text-center text-red-500">Log in as an operator.</div></>;

  const list: any[] = drivers ?? [];
  const upcoming: any[] = (trips ?? []).filter((t: any) => ['SCHEDULED', 'BOARDING'].includes(t.status)).slice(0, 8);

  return (
    <>
      <OperatorNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Drivers</h1>
        <p className="text-slate-500 text-sm mb-6">Your driver roster and trip assignments.</p>

        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Loading…</div>
        ) : (
          <>
            {/* Roster */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {list.length === 0 && <div className="card text-slate-400">No drivers yet.</div>}
              {list.map((d) => (
                <div key={d.id} className="card flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={24} /></div>
                  <div className="flex-1">
                    <div className="font-bold">{d.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{d.cnic || 'No CNIC'}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Route size={12} /> {d.completedTrips} trips</span>
                      <span className="flex items-center gap-1"><Star size={12} className="text-amber-400 fill-amber-400" /> {d.rating ?? '—'} ({d.reviews})</span>
                    </div>
                  </div>
                  <a href={`/verify-driver`} className="text-slate-300 hover:text-orange-500" title="Verify record"><ShieldCheck size={18} /></a>
                </div>
              ))}
            </div>

            {/* Assignment */}
            <h2 className="font-bold text-lg mb-3">Assign drivers to upcoming trips</h2>
            {upcoming.length === 0 ? (
              <div className="card text-slate-400 text-sm">No upcoming trips.</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((t) => (
                  <div key={t.id} className="card flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">Trip {t.id.slice(0, 6).toUpperCase()}</div>
                      <div className="text-xs text-slate-400">{new Date(t.departureTime).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {t.status}</div>
                    </div>
                    <select
                      className="input py-2 text-sm max-w-[180px]"
                      value={list.find((d) => d.id === t.driverId)?.id || ''}
                      onChange={(e) => assign.mutate({ tripId: t.id, driverId: e.target.value })}
                    >
                      <option value="" disabled>Assign driver…</option>
                      {list.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}{d.rating ? ` (${d.rating}★)` : ''}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
