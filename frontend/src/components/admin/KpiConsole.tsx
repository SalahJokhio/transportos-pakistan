'use client';
import { useQuery } from '@tanstack/react-query';
import { kpiApi, predictiveApi } from '@/lib/api/admin';
import { Gauge, Banknote, Users2, Fuel, Bus, Star, Timer, Wrench, Headphones, TrendingUp } from 'lucide-react';

const RISK_STYLE: Record<string, string> = { HIGH: 'bg-red-50 text-red-600', MEDIUM: 'bg-amber-50 text-amber-700', LOW: 'bg-green-50 text-green-700' };

function Predictions() {
  const { data } = useQuery({ queryKey: ['predict'], queryFn: predictiveApi.overview });
  if (!data) return null;
  const p: any = data;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-gray-800"><TrendingUp size={18} className="text-indigo-600" /><span className="font-semibold text-sm">Predictive AI</span><span className="text-xs text-slate-400">directional, with confidence</span></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Breakdown risk (top buses)</div>
          {(p.breakdown?.buses ?? []).slice(0, 4).map((b: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span>{b.bus} <span className="text-[10px] text-slate-400">{b.incidents90d} inc · {b.ageYears}y</span></span>
              <span className="font-semibold text-orange-600">{b.breakdownProbability}% <span className="text-[10px] text-slate-400">{b.confidence}</span></span>
            </div>
          ))}
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Driver fatigue risk</div>
          {(p.fatigue?.drivers ?? []).slice(0, 4).map((d: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span className="text-slate-500">{d.trips7d} trips · {d.hours7d}h (7d)</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded ${RISK_STYLE[d.fatigueRisk]}`}>{d.fatigueRisk}</span>
            </div>
          ))}
          {(p.fatigue?.drivers ?? []).length === 0 && <div className="text-xs text-slate-400">No recent trips.</div>}
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Complaint volume</div>
          <div className="text-2xl font-bold text-slate-800">{p.complaints?.projectedNextWeek ?? 0}</div>
          <div className="text-xs text-slate-500">projected next week · {p.complaints?.confidence} confidence</div>
          <div className="text-[11px] text-slate-400 mt-1">avg {p.complaints?.average}/wk</div>
        </div>
      </div>
    </div>
  );
}

const ICONS: Record<string, any> = {
  revenue: Banknote, occupancy: Users2, fuel_efficiency: Fuel, utilization: Bus,
  driver_rating: Star, avg_delay: Timer, workshop: Wrench, complaint_resolution: Headphones,
};

/** KPI Engine dashboard — the operating KPIs the blueprint lists, from live data. */
export function KpiConsole() {
  const { data: kpis = [], isLoading } = useQuery({ queryKey: ['kpi'], queryFn: kpiApi.overview });

  const fmt = (k: any) => {
    if (k.unit === 'Rs') return `Rs ${Number(k.value).toLocaleString('en-PK')}`;
    if (k.unit === '%' || k.unit === 'min' || k.unit === 'reports') return `${k.value}${k.unit === '%' ? '%' : ` ${k.unit}`}`;
    return `${k.value} ${k.unit}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <Gauge size={20} className="text-orange-600" />
        <div>
          <div className="font-semibold">KPI Engine</div>
          <div className="text-xs text-gray-500">Operating KPIs computed from your live data (last 30 days).</div>
        </div>
      </div>

      {isLoading ? (
        <div className="card text-center py-10 text-slate-400 text-sm">Computing KPIs…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k: any) => {
            const Icon = ICONS[k.key] || Gauge;
            return (
              <div key={k.key} className="card p-4">
                <div className="flex items-center justify-between">
                  <Icon size={16} className="text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-slate-800 mt-2">{fmt(k)}</div>
                <div className="text-xs font-medium text-slate-600 mt-0.5">{k.label}</div>
                <div className="text-[11px] text-slate-400 mt-1">{k.hint}</div>
              </div>
            );
          })}
        </div>
      )}

      <Predictions />
    </div>
  );
}
