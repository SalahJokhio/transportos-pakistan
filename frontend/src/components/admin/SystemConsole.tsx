'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Activity, ShieldAlert, Download, Save, Database } from 'lucide-react';

/** Platform ops: system health, fraud-rule engine, and finance/tax CSV exports. */
export function SystemConsole() {
  const [tab, setTab] = useState<'health' | 'fraud' | 'exports'>('health');
  return (
    <div>
      <div className="flex gap-2 mb-5">
        {([['health', 'System health'], ['fraud', 'Fraud rules'], ['exports', 'Exports']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
        ))}
      </div>
      {tab === 'health' && <Health />}
      {tab === 'fraud' && <Fraud />}
      {tab === 'exports' && <Exports />}
    </div>
  );
}

function Health() {
  const { data: h } = useQuery({ queryKey: ['system-health'], queryFn: adminApi.getSystemHealth, refetchInterval: 15000 });
  const up = h?.database === 'up';
  return (
    <div className="space-y-4">
      <div className={`card p-4 flex items-center gap-3 ${up ? '' : 'border-red-300'}`}>
        <div className={`w-3 h-3 rounded-full ${up ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-semibold">{h?.status === 'healthy' ? 'All systems healthy' : 'Degraded'}</span>
        <span className="text-xs text-gray-400 ml-auto">updated {h?.timestamp ? new Date(h.timestamp).toLocaleTimeString() : '…'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Database', h?.database ?? '…', Database],
          ['Uptime (s)', h?.uptimeSeconds ?? '…', Activity],
          ['Memory (MB)', h?.memoryMB ?? '…', Activity],
          ['Users', h?.counts?.users ?? '…', Activity],
          ['Bookings', h?.counts?.bookings ?? '…', Activity],
          ['Payments', h?.counts?.payments ?? '…', Activity],
        ].map(([label, val]) => (
          <div key={label as string} className="card p-4">
            <div className="text-xs text-gray-500">{label as string}</div>
            <div className="text-lg font-bold text-gray-800">{String(val)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Fraud() {
  const qc = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ['fraud-rules'], queryFn: adminApi.getFraudRules });
  const { data: evalData } = useQuery({ queryKey: ['fraud-eval'], queryFn: adminApi.evaluateFraud });
  const [draft, setDraft] = useState<any>(null);
  const r = draft ?? rules ?? {};
  const save = useMutation({ mutationFn: () => adminApi.setFraudRules(r), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fraud-rules'] }); qc.invalidateQueries({ queryKey: ['fraud-eval'] }); } });

  return (
    <div className="space-y-6">
      <div className="card p-5 max-w-lg">
        <div className="flex items-center gap-2 font-semibold text-gray-800 mb-3"><ShieldAlert size={16} /> Fraud thresholds</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Max cancellations<input type="number" value={r.maxCancellations ?? ''} onChange={(e) => setDraft({ ...r, maxCancellations: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
          <label className="text-sm">Max bookings / hour<input type="number" value={r.maxBookingsPerHour ?? ''} onChange={(e) => setDraft({ ...r, maxBookingsPerHour: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
        </div>
        <button onClick={() => save.mutate()} className="mt-4 bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1"><Save size={14} /> {save.isSuccess ? 'Saved' : 'Save rules'}</button>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-gray-800">Flagged users ({evalData?.flagged ?? 0})</div>
        <table className="w-full text-sm">
          <tbody>
            {(evalData?.signals ?? []).map((s: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium">{s.name}</td>
                <td className="px-4 py-2 text-gray-400">{s.phone}</td>
                <td className="px-4 py-2">{s.reason}</td>
                <td className="px-4 py-2 text-right font-semibold text-red-600">{s.value}</td>
              </tr>
            ))}
            {(evalData?.signals ?? []).length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={4}>No fraud signals.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Exports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const download = async (kind: 'bookings' | 'payments') => {
    const csv: any = kind === 'bookings' ? await adminApi.exportBookingsCsv(from, to) : await adminApi.exportPaymentsCsv(from, to);
    const blob = new Blob([typeof csv === 'string' ? csv : JSON.stringify(csv)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${kind}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-5 max-w-xl">
      <div className="flex items-center gap-2 font-semibold text-gray-800 mb-1"><Download size={16} /> Finance / tax exports</div>
      <p className="text-xs text-gray-500 mb-4">GST-broken-down bookings and the payments ledger, as CSV for FBR/accounting.</p>
      <div className="flex gap-3 items-end mb-4">
        <label className="text-sm">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block border rounded px-2 py-1.5" /></label>
        <label className="text-sm">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block border rounded px-2 py-1.5" /></label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => download('bookings')} className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1"><Download size={14} /> Bookings (GST) CSV</button>
        <button onClick={() => download('payments')} className="bg-gray-700 text-white text-sm px-4 py-2 rounded flex items-center gap-1"><Download size={14} /> Payments CSV</button>
      </div>
    </div>
  );
}
