'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { simulationApi } from '@/lib/api/admin';
import { FlaskConical, TrendingUp, Fuel, Ban, Route, Play } from 'lucide-react';

const SCENARIOS = [
  { id: 'demand_spike', label: 'Demand spike (Eid)', icon: TrendingUp, field: { key: 'multiplier', label: 'Demand multiplier (×)', default: '3', type: 'number' } },
  { id: 'fuel_price', label: 'Fuel price change', icon: Fuel, field: { key: 'pctChange', label: 'Fuel price change (%)', default: '15', type: 'number' } },
  { id: 'route_closure', label: 'Route closure', icon: Ban, field: { key: 'route', label: 'Route (e.g. Karachi)', default: 'Karachi', type: 'text' } },
  { id: 'new_route', label: 'New route launch', icon: Route, field: { key: 'price', label: 'Fare (Rs)', default: '1800', type: 'number' } },
];

/** Digital Twin: run what-if scenarios grounded in real data. */
export function SimulationConsole() {
  const [active, setActive] = useState(SCENARIOS[0]);
  const [val, setVal] = useState(SCENARIOS[0].field.default);
  const [result, setResult] = useState<any>(null);

  const run = useMutation({
    mutationFn: () => simulationApi.run(active.id, { [active.field.key]: active.field.type === 'number' ? Number(val) : val }),
    onSuccess: (r: any) => setResult(r),
  });

  const pick = (s: typeof SCENARIOS[number]) => { setActive(s); setVal(s.field.default); setResult(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <FlaskConical size={20} className="text-indigo-600" />
        <div>
          <div className="font-semibold">Digital Twin — What-if Simulation</div>
          <div className="text-xs text-gray-500">Project scenarios against your live operation. Directional, not a forecast.</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => pick(s)}
              className={`text-left border rounded-xl p-4 transition-all ${active.id === s.id ? 'border-indigo-300 ring-2 ring-indigo-100 bg-white' : 'border-slate-200 hover:border-indigo-200 bg-white'}`}>
              <Icon size={18} className="text-indigo-600" />
              <div className="font-medium text-sm mt-2">{s.label}</div>
            </button>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="text-sm flex-1 min-w-[220px]">{active.field.label}
            <input type={active.field.type} value={val} onChange={(e) => setVal(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
          </label>
          <button onClick={() => run.mutate()} disabled={run.isPending}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40">
            <Play size={14} /> {run.isPending ? 'Simulating…' : 'Run simulation'}
          </button>
        </div>

        {result && (
          <div className="mt-5 border-t pt-4">
            <div className="text-sm font-medium text-gray-800 mb-2">{result.insight}</div>
            <div className="grid sm:grid-cols-2 gap-4">
              {result.baseline && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Baseline</div>
                  {Object.entries(result.baseline).map(([k, v]) => <div key={k} className="text-sm flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium">Rs {Number(v).toLocaleString()}</span></div>)}
                </div>
              )}
              {(result.projected || result.atRisk) && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-xs text-indigo-400 uppercase mb-1">{result.atRisk ? 'At risk' : 'Projected'}</div>
                  {Object.entries(result.projected || result.atRisk).map(([k, v]) => <div key={k} className="text-sm flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium">{typeof v === 'number' && Math.abs(v as number) > 100 ? `Rs ${Number(v).toLocaleString()}` : String(v)}</span></div>)}
                </div>
              )}
            </div>
            {result.assumptions && (
              <div className="mt-3 text-xs text-slate-500">
                <span className="font-medium">Assumptions:</span> {result.assumptions.join(' · ')}
                <span className="ml-2 inline-block bg-slate-100 rounded px-1.5 py-0.5">confidence: {result.confidence}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
