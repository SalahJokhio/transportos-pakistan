'use client';
import { useQuery } from '@tanstack/react-query';
import { kpiApi } from '@/lib/api/admin';
import { Gauge, Banknote, Users2, Fuel, Bus, Star, Timer, Wrench, Headphones } from 'lucide-react';

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
    </div>
  );
}
