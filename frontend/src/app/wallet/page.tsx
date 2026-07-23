'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { Wallet, Plus, Gift, Star, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { MembershipCard } from '@/components/MembershipCard';

const rs = (n: number) => `Rs ${Math.round(n || 0).toLocaleString()}`;

const TX: Record<string, { label: string; sign: string; color: string }> = {
  TOPUP: { label: 'Top-up', sign: '+', color: 'text-green-600' },
  POINTS_REDEEM: { label: 'Points redeemed', sign: '+', color: 'text-green-600' },
  REFUND: { label: 'Refund', sign: '+', color: 'text-green-600' },
  PAYMENT: { label: 'Ticket payment', sign: '−', color: 'text-red-500' },
};

export default function WalletPage() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [amt, setAmt] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: () => walletApi.get(), enabled: isAuthenticated });

  const topup = useMutation({
    mutationFn: (a: number) => walletApi.topup(a),
    onSuccess: () => { setAmt(''); qc.invalidateQueries({ queryKey: ['wallet'] }); },
  });
  const redeem = useMutation({
    mutationFn: (p: number) => walletApi.redeemPoints(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet'] }),
  });

  if (!isAuthenticated) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-500">Log in to see your wallet.</div>;
  if (isLoading) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">Loading wallet…</div>;

  const balance = data?.balance ?? 0;
  const points = data?.loyaltyPoints ?? 0;
  const txns: any[] = data?.transactions ?? [];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Balance card */}
      <div className="rounded-2xl p-6 text-white mb-5" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
        <div className="flex items-center gap-2 text-white/60 text-sm mb-1"><Wallet size={16} /> Wallet balance</div>
        <div className="text-4xl font-extrabold">{rs(balance)}</div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <Star size={15} className="text-amber-400 fill-amber-400" />
          <span className="text-white/80">{points} loyalty points</span>
          {points >= 1 && (
            <button
              onClick={() => redeem.mutate(points)}
              disabled={redeem.isPending}
              className="ml-auto text-xs bg-orange-500 hover:bg-orange-600 rounded-full px-3 py-1.5 font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <Gift size={13} /> Redeem to cash
            </button>
          )}
        </div>
      </div>

      {/* Membership tier */}
      <MembershipCard />

      {/* Top up */}
      <div className="card mb-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Plus size={17} className="text-orange-600" /> Add money</h3>
        <div className="flex gap-2 mb-3">
          {[500, 1000, 2000, 5000].map((v) => (
            <button key={v} onClick={() => setAmt(String(v))}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${amt === String(v) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
              {rs(v)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" type="number" placeholder="Enter amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button onClick={() => amt && topup.mutate(Number(amt))} disabled={!amt || topup.isPending} className="btn-primary px-6 disabled:opacity-40">
            {topup.isPending ? '…' : 'Top up'}
          </button>
        </div>
      </div>

      {/* Transactions */}
      <h3 className="font-bold mb-3 px-1">Recent activity</h3>
      {txns.length === 0 ? (
        <div className="card text-center py-10 text-slate-400">No transactions yet.</div>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => {
            const meta = TX[t.type] || { label: t.type, sign: '', color: 'text-slate-600' };
            const credit = Number(t.amount) >= 0;
            return (
              <div key={t.id} className="card flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${credit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {credit ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{meta.label}</div>
                  <div className="text-xs text-slate-400">{t.description || ''} · {new Date(t.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div className={`font-bold ${meta.color}`}>{meta.sign}{rs(Math.abs(Number(t.amount)))}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
