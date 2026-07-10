'use client';
import { useQuery } from '@tanstack/react-query';
import { operatorApi } from '@/lib/api/operator';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { TrendingUp, TrendingDown, Wallet, Receipt, Bus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const rs = (n: number) => `Rs ${Math.round(n || 0).toLocaleString()}`;

export default function FinancePage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['fleet-report'], queryFn: () => operatorApi.fleetReport() });

  if (isLoading) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">Loading fleet report…</div>;
  if (error) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-red-500">Could not load. Log in as an operator.</div>;

  const t = data?.totals ?? { revenue: 0, expenses: 0, profit: 0 };
  const fleet: any[] = data?.fleet ?? [];
  const best = data?.bestPerformer;
  const worst = data?.worstPerformer;

  return (
    <>
    <OperatorNav />
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Fleet finance</h1>
      <p className="text-slate-500 text-sm mb-6">Revenue vs expenses per bus — which buses earn, which lose money.</p>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Wallet size={15} /> Revenue</div>
          <div className="text-2xl font-bold text-slate-800">{rs(t.revenue)}</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Receipt size={15} /> Expenses</div>
          <div className="text-2xl font-bold text-red-500">{rs(t.expenses)}</div>
        </div>
        <div className={`card ${t.profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            {t.profit >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} Net profit
          </div>
          <div className={`text-2xl font-bold ${t.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{rs(t.profit)}</div>
        </div>
      </div>

      {/* Best / worst */}
      {best && worst && fleet.length > 1 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><ArrowUpRight size={20} /></div>
            <div>
              <div className="text-xs text-slate-400">Best performer</div>
              <div className="font-bold">{best.registration}</div>
              <div className="text-sm text-green-600 font-semibold">{rs(best.profit)} profit</div>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center"><ArrowDownRight size={20} /></div>
            <div>
              <div className="text-xs text-slate-400">Lowest performer</div>
              <div className="font-bold">{worst.registration}</div>
              <div className={`text-sm font-semibold ${worst.profit >= 0 ? 'text-slate-600' : 'text-red-600'}`}>{rs(worst.profit)} profit</div>
            </div>
          </div>
        </div>
      )}

      {/* Per-bus table */}
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
          <div className="col-span-4">Bus</div>
          <div className="col-span-1 text-center">Trips</div>
          <div className="col-span-2 text-right">Revenue</div>
          <div className="col-span-2 text-right">Expenses</div>
          <div className="col-span-3 text-right">Profit / Loss</div>
        </div>
        {fleet.length === 0 && <div className="px-5 py-10 text-center text-slate-400">No buses yet.</div>}
        {fleet.map((b) => (
          <div key={b.busId} className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-slate-50 last:border-0 items-center">
            <div className="col-span-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><Bus size={16} /></div>
              <div>
                <div className="font-semibold text-sm">{b.registration}</div>
                <div className="text-xs text-slate-400">{b.busType} · {b.make}</div>
              </div>
            </div>
            <div className="col-span-1 text-center text-sm text-slate-600">{b.trips}</div>
            <div className="col-span-2 text-right text-sm font-medium">{rs(b.revenue)}</div>
            <div className="col-span-2 text-right text-sm text-red-500">{b.expenses ? `−${rs(b.expenses)}` : rs(0)}</div>
            <div className="col-span-3 text-right">
              <span className={`inline-flex items-center gap-1 font-bold ${b.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {b.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {rs(b.profit)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
