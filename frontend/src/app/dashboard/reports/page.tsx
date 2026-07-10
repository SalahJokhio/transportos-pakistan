'use client';
import { useQuery } from '@tanstack/react-query';
import { operatorApi, MEDIA_BASE } from '@/lib/api/operator';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { AlertTriangle, Fuel, Receipt, StickyNote, Wallet } from 'lucide-react';

const rs = (n: number) => `Rs ${Math.round(n || 0).toLocaleString()}`;

const TYPE: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  INCIDENT: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Incident' },
  REFUEL: { icon: Fuel, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Refuel' },
  EXPENSE: { icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Expense' },
  NOTE: { icon: StickyNote, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Note' },
};

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['fleet-reports'], queryFn: () => operatorApi.reports() });

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">Loading reports…</div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-red-500">Log in as an operator to view reports.</div>;

  const reports: any[] = data?.reports ?? [];

  return (
    <>
    <OperatorNav />
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Driver reports</h1>
      <p className="text-slate-500 text-sm mb-5">Incidents, refuels and expenses reported by your drivers on the road.</p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card"><div className="text-slate-500 text-xs mb-1">Reports</div><div className="text-2xl font-bold">{data?.count ?? 0}</div></div>
        <div className="card"><div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Incidents</div><div className="text-2xl font-bold text-red-500">{data?.incidents ?? 0}</div></div>
        <div className="card"><div className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Wallet size={12} /> Spent</div><div className="text-2xl font-bold text-orange-600">{rs(data?.totalSpent ?? 0)}</div></div>
      </div>

      {reports.length === 0 && <div className="card text-center py-14 text-slate-400">No reports yet.</div>}

      <div className="space-y-3">
        {reports.map((r) => {
          const t = TYPE[r.type] || TYPE.NOTE;
          const Icon = t.icon;
          return (
            <div key={r.id} className="card">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${t.bg} ${t.color} flex items-center justify-center shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.label}{r.category ? ` · ${String(r.category).replace(/_/g, ' ')}` : ''}</span>
                    {Number(r.amount) > 0 && <span className="font-bold text-orange-600">{rs(r.amount)}{r.litres ? ` · ${r.litres}L` : ''}</span>}
                  </div>
                  {r.description && <p className="text-sm text-slate-500 mt-1">{r.description}</p>}
                  <div className="text-xs text-slate-400 mt-1">
                    Bus {String(r.busId).slice(0, 6)} · {new Date(r.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {/* Photos */}
                  {r.mediaUrls?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {r.mediaUrls.map((m: string, i: number) => (
                        <a key={i} href={`${MEDIA_BASE}${m}`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`${MEDIA_BASE}${m}`} alt="report" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
