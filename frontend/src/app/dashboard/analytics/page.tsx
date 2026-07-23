'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, aiApi } from '@/lib/api/endpoints';
import { operatorApi } from '@/lib/api/operator';
import { useAuthStore } from '@/store/auth.store';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { TrendingUp, MapPin, CreditCard, Sparkles, Loader2, Clock } from 'lucide-react';

const rs = (n: number) => `Rs ${Math.round(n || 0).toLocaleString()}`;

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  // Operators see their own numbers; SUPER_ADMIN sees the whole platform.
  const companyId = user && user.role !== 'SUPER_ADMIN' ? user.id : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-overview', companyId],
    queryFn: () => analyticsApi.overview(companyId),
  });

  if (isLoading) return <><OperatorNav /><div className="py-16 text-center text-slate-400">Loading analytics…</div></>;
  if (error) return <><OperatorNav /><div className="py-16 text-center text-red-500">Log in to view analytics.</div></>;

  const t = data?.totals ?? {};
  const trend: any[] = data?.revenueByDay ?? [];
  const maxRev = Math.max(1, ...trend.map((d) => d.revenue));
  const topRoutes: any[] = data?.topRoutes ?? [];
  const paymentMix: any[] = data?.paymentMix ?? [];

  return (
    <>
      <OperatorNav />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-slate-500 text-sm">{companyId ? 'Your operation' : 'Platform-wide'} performance.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Revenue', rs(t.revenue)],
            ['Confirmed', t.confirmed ?? 0],
            ['Cancelled', t.cancelled ?? 0],
            ['Cancel rate', `${Math.round((t.cancelRate ?? 0) * 100)}%`],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-white rounded-xl border p-4">
              <div className="text-xs text-slate-500">{label as string}</div>
              <div className="text-lg font-bold text-slate-800">{val as any}</div>
            </div>
          ))}
        </div>

        {/* Revenue trend (last 14 days) */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800 mb-4"><TrendingUp size={16} /> Revenue — last 14 days</div>
          {trend.length === 0 ? (
            <div className="text-slate-400 text-sm py-6 text-center">No confirmed bookings yet.</div>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {trend.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="w-full bg-orange-500/80 rounded-t hover:bg-orange-600 transition-all"
                    style={{ height: `${(d.revenue / maxRev) * 100}%` }} title={`${d.day}: ${rs(d.revenue)}`} />
                  <span className="text-[9px] text-slate-400 mt-1 rotate-45 origin-left whitespace-nowrap">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top routes */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3"><MapPin size={16} /> Top routes</div>
            {topRoutes.length === 0 ? <div className="text-slate-400 text-sm">No data.</div> : topRoutes.map((r, i) => (
              <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm">
                <span>{r.origin} → {r.destination}</span>
                <span className="font-semibold text-orange-600">{rs(r.revenue)}</span>
              </div>
            ))}
          </div>

          {/* Payment mix */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3"><CreditCard size={16} /> Payment mix</div>
            {paymentMix.length === 0 ? <div className="text-slate-400 text-sm">No payments yet.</div> : paymentMix.map((p, i) => (
              <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm capitalize">
                <span>{p.provider} <span className="text-slate-400">({p.count})</span></span>
                <span className="font-semibold">{rs(p.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <BookingFunnel />
        <NoShowAndConflicts companyId={companyId} />
        <ForecastAndScorecards companyId={companyId} />
        <DynamicPricing />
      </div>
    </>
  );
}

/** #4 — booking funnel: where users drop off (search → seat → pay-start → paid). */
function BookingFunnel() {
  const { data } = useQuery({ queryKey: ['analytics-funnel'], queryFn: () => analyticsApi.funnel(14) });
  const stages: any[] = data?.stages ?? [];
  const max = Math.max(1, ...stages.map((s) => s.count));
  const label: Record<string, string> = { search: 'Searched', seat_select: 'Picked seats', pay_start: 'Started payment', pay_done: 'Booked' };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-slate-800"><TrendingUp size={16} /> Booking funnel (14d)</div>
        <span className="text-sm text-slate-500">Conversion: <b className="text-orange-600">{data?.conversion ?? 0}%</b></span>
      </div>
      <div className="space-y-2">
        {stages.map((s) => (
          <div key={s.stage} className="flex items-center gap-3 text-sm">
            <span className="w-28 text-slate-500">{label[s.stage] || s.stage}</span>
            <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
              <div className="h-6 bg-orange-500/80 rounded flex items-center px-2 text-xs text-white" style={{ width: `${Math.max(6, (s.count / max) * 100)}%` }}>{s.count}</div>
            </div>
            <span className="w-12 text-right text-slate-400">{s.pctOfSearch}%</span>
          </div>
        ))}
        {stages.every((s) => s.count === 0) && <div className="text-slate-400 text-sm py-2">No funnel data yet — book a ticket to populate.</div>}
      </div>
    </div>
  );
}

/** #9 no-show rate → suggested overbooking + #10 schedule conflicts. */
function NoShowAndConflicts({ companyId }: { companyId?: string }) {
  const { data: ns } = useQuery({ queryKey: ['analytics-noshow', companyId], queryFn: () => analyticsApi.noShow(companyId) });
  const { data: conf } = useQuery({ queryKey: ['schedule-conflicts'], queryFn: () => analyticsApi.scheduleConflicts(), retry: false });
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4">
        <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3"><MapPin size={16} /> No-show & overbooking</div>
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left text-xs"><tr><th className="py-1">Route</th><th>No-show</th><th>Rate</th><th>Suggest oversell</th></tr></thead>
          <tbody>
            {(ns?.routes ?? []).map((r: any, i: number) => (
              <tr key={i} className="border-t"><td className="py-1.5">{r.origin} → {r.destination}</td><td>{r.noShow}/{r.confirmed}</td><td>{r.noShowRate}%</td><td className="font-semibold text-orange-600">+{r.suggestedOverbookPct}%</td></tr>
            ))}
            {(ns?.routes ?? []).length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">No departed-trip data yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3"><Clock size={16} /> Schedule conflicts</div>
        {(conf?.total ?? 0) === 0 ? (
          <div className="text-sm text-green-600 py-2">✓ No bus/driver double-bookings.</div>
        ) : (
          <div className="space-y-1 text-sm">
            {[...(conf?.busConflicts ?? []).map((c: any) => ({ ...c, kind: 'Bus' })), ...(conf?.driverConflicts ?? []).map((c: any) => ({ ...c, kind: 'Driver' }))].map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b last:border-0 py-1.5">
                <span className="text-red-600 font-medium">{c.kind} clash</span>
                <span className="text-xs text-slate-400">{new Date(c.aDep).toLocaleString()} ↔ {new Date(c.bDep).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** #16 — demand forecast per route + driver scorecards. */
function ForecastAndScorecards({ companyId }: { companyId?: string }) {
  const { data: fc } = useQuery({ queryKey: ['analytics-forecast', companyId], queryFn: () => analyticsApi.forecast(companyId) });
  const { data: sc } = useQuery({ queryKey: ['analytics-scorecards', companyId], queryFn: () => analyticsApi.driverScorecards(companyId) });
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4">
        <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3"><Sparkles size={16} /> Demand forecast</div>
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left text-xs"><tr><th className="py-1">Route</th><th>Trips</th><th>Avg/trip</th><th>Next wk</th><th>Confidence</th></tr></thead>
          <tbody>
            {(fc?.routes ?? []).map((r: any, i: number) => {
              const cc = r.confidenceLabel === 'HIGH' ? 'bg-green-50 text-green-700' : r.confidenceLabel === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500';
              return (
                <tr key={i} className="border-t">
                  <td className="py-1.5">{r.origin} → {r.destination}</td><td>{r.trips}</td><td>{r.avgPerTrip}</td>
                  <td className="font-semibold text-orange-600" title={r.rangeLow != null ? `range ${r.rangeLow}–${r.rangeHigh}` : ''}>
                    {r.projectedNextWeek}{r.rangeLow != null && <span className="text-[10px] text-slate-400 font-normal"> ({r.rangeLow}–{r.rangeHigh})</span>}
                  </td>
                  <td>{r.confidenceLabel && <span className={`text-[10px] px-1.5 py-0.5 rounded ${cc}`}>{r.confidenceLabel}</span>}</td>
                </tr>
              );
            })}
            {(fc?.routes ?? []).length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-400">Not enough data yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3"><TrendingUp size={16} /> Driver scorecards</div>
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left text-xs"><tr><th className="py-1">Driver</th><th>Rating</th><th>Reviews</th><th>Trips done</th></tr></thead>
          <tbody>
            {(sc?.drivers ?? []).map((d: any, i: number) => (
              <tr key={i} className="border-t"><td className="py-1.5 font-mono text-xs">{String(d.driverId).slice(0, 8)}</td><td>{d.avgRating ?? '—'}⭐</td><td>{d.reviews}</td><td>{d.tripsCompleted}/{d.tripsTotal}</td></tr>
            ))}
            {(sc?.drivers ?? []).length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">No driver data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** AI dynamic-pricing tool: list the operator's upcoming trips and suggest a fare. */
function DynamicPricing() {
  const { data: trips } = useQuery({
    queryKey: ['operator-trips-ai'],
    queryFn: () => (operatorApi as any).trips?.() ?? Promise.resolve([]),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [sugg, setSugg] = useState<Record<string, any>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const suggest = async (tripId: string) => {
    setOpenId(tripId);
    if (sugg[tripId]) return;
    setLoadingId(tripId);
    try {
      const r = await aiApi.priceSuggestion(tripId);
      setSugg((s) => ({ ...s, [tripId]: r }));
    } catch { /* ignore */ } finally { setLoadingId(null); }
  };

  const list: any[] = Array.isArray(trips) ? trips : (trips?.data ?? []);
  if (list.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1"><Sparkles size={16} className="text-orange-600" /> Dynamic pricing (AI)</div>
      <p className="text-xs text-slate-500 mb-4">Demand-based fare suggestions from occupancy, lead time and departure slot. Advisory only.</p>
      {list.slice(0, 8).map((t: any) => {
        const s = sugg[t.id];
        return (
          <div key={t.id} className="border-b last:border-0 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Base {rs(t.basePrice)}</span>
                <span className="text-slate-400 ml-2">{(t.departureTime || '').slice(0, 16).replace('T', ' ')}</span>
              </div>
              <button onClick={() => suggest(t.id)} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded flex items-center gap-1">
                {loadingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Suggest
              </button>
            </div>
            {openId === t.id && s && (
              <div className="mt-2 bg-orange-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-orange-700">{rs(s.suggestedPrice)}</span>
                  <span className="text-xs text-slate-500">×{s.suggestedMultiplier} · {Math.round((s.occupancy ?? 0) * 100)}% full · {s.daysToDeparture}d out</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{s.reason}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
