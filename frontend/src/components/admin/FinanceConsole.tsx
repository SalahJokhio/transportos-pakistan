'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Banknote, RefreshCw, CheckCircle, RotateCcw } from 'lucide-react';

const pkr = (n: number) => 'Rs ' + Number(n || 0).toLocaleString('en-PK');

/**
 * SuperAdmin finance console: operator settlements (what we owe each operator,
 * gross → commission → net → outstanding, with a payout action) and a refunds
 * panel (recent payments with a one-click refund to the passenger's wallet).
 */
export function FinanceConsole() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<'settlements' | 'refunds'>('settlements');

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['admin-settlement-summary'],
    queryFn: adminApi.getSettlementSummary,
  });
  const { data: settlements } = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: () => adminApi.listSettlements(),
  });
  const { data: payments } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => adminApi.listPayments(50),
    enabled: subTab === 'refunds',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-settlement-summary'] });
    qc.invalidateQueries({ queryKey: ['admin-settlements'] });
    qc.invalidateQueries({ queryKey: ['admin-payments'] });
  };

  const genMut = useMutation({ mutationFn: (companyId: string) => adminApi.generateSettlement(companyId), onSuccess: invalidate });
  const payMut = useMutation({ mutationFn: (id: string) => adminApi.paySettlement(id, `IBFT-${Date.now()}`), onSuccess: invalidate });
  const refundMut = useMutation({
    mutationFn: (p: { id: string }) => adminApi.refundPayment(p.id, undefined, 'Admin refund'),
    onSuccess: invalidate,
  });

  const totals = summary?.totals;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(['settlements', 'refunds'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              subTab === t ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'settlements' && (
        <div className="space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Gross revenue', totals?.gross],
              [`Commission (${summary?.commissionPct ?? 0}%)`, totals?.commission],
              ['Net to operators', totals?.net],
              ['Outstanding', totals?.outstanding],
            ].map(([label, val]) => (
              <div key={label as string} className="card p-4">
                <div className="text-xs text-gray-500">{label as string}</div>
                <div className="text-lg font-bold text-gray-800">{pkr(val as number)}</div>
              </div>
            ))}
          </div>

          {/* Per-operator payable */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800">
              <Banknote size={16} /> Operator payables
            </div>
            {sumLoading ? (
              <div className="p-6 text-center text-gray-400">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-4 py-2">Operator</th>
                    <th className="px-4 py-2">Bookings</th>
                    <th className="px-4 py-2">Gross</th>
                    <th className="px-4 py-2">Commission</th>
                    <th className="px-4 py-2">Net</th>
                    <th className="px-4 py-2">Outstanding</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.operators ?? []).map((o: any) => (
                    <tr key={o.companyId} className="border-t">
                      <td className="px-4 py-2 font-medium">{o.companyName}<div className="text-xs text-gray-400">{o.phone}</div></td>
                      <td className="px-4 py-2">{o.bookingCount}</td>
                      <td className="px-4 py-2">{pkr(o.gross)}</td>
                      <td className="px-4 py-2 text-gray-500">{pkr(o.commission)}</td>
                      <td className="px-4 py-2">{pkr(o.net)}</td>
                      <td className="px-4 py-2 font-semibold text-orange-600">{pkr(o.outstanding)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          disabled={o.outstanding <= 0 || genMut.isPending}
                          onClick={() => genMut.mutate(o.companyId)}
                          className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded disabled:opacity-40"
                        >
                          Generate payout
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(summary?.operators ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No confirmed revenue yet.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Generated settlements */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-gray-800">Payout records</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-2">Operator</th>
                  <th className="px-4 py-2">Net payable</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(settlements ?? []).map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{s.companyName}</td>
                    <td className="px-4 py-2">{pkr(s.netPayable)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${s.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{s.reference || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      {s.status !== 'PAID' && (
                        <button onClick={() => payMut.mutate(s.id)} disabled={payMut.isPending}
                          className="text-xs flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded disabled:opacity-40 ml-auto">
                          <CheckCircle size={13} /> Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(settlements ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No payouts generated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'refunds' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800">
            <RefreshCw size={16} /> Recent payments
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">PNR</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Refunded</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{p.pnr || p.bookingId?.slice(0, 8)}</td>
                  <td className="px-4 py-2 capitalize">{p.provider}</td>
                  <td className="px-4 py-2">{pkr(p.amount)}</td>
                  <td className="px-4 py-2 text-gray-500">{pkr(p.refundedAmount)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      p.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                      : p.status === 'REFUNDED' ? 'bg-gray-200 text-gray-600'
                      : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.status === 'COMPLETED' && p.refundedAmount < p.amount && (
                      <button
                        onClick={() => { if (confirm(`Refund ${pkr(p.amount - p.refundedAmount)} for ${p.pnr}?`)) refundMut.mutate({ id: p.id }); }}
                        disabled={refundMut.isPending}
                        className="text-xs flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded disabled:opacity-40 ml-auto">
                        <RotateCcw size={13} /> Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
