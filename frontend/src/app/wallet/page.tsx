'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyApi } from '@/lib/api/loyalty';
import { Star, TrendingUp, TrendingDown, Gift, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const TX_ICON: Record<string, React.ReactNode> = {
  EARN: <TrendingUp className="h-4 w-4 text-green-500" />,
  REDEEM: <TrendingDown className="h-4 w-4 text-orange-500" />,
  BONUS: <Gift className="h-4 w-4 text-purple-500" />,
  EXPIRE: <Clock className="h-4 w-4 text-red-400" />,
  REFUND: <TrendingUp className="h-4 w-4 text-blue-500" />,
};

const TX_COLOR: Record<string, string> = {
  EARN: 'text-green-600',
  REDEEM: 'text-orange-600',
  BONUS: 'text-purple-600',
  EXPIRE: 'text-red-500',
  REFUND: 'text-blue-600',
};

export default function WalletPage() {
  const [page, setPage] = useState(1);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const qc = useQueryClient();

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: loyaltyApi.getBalance,
    staleTime: 10000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['loyalty-history', page],
    queryFn: () => loyaltyApi.getHistory(page, 15),
    placeholderData: (prev) => prev,
  });

  const redeemMut = useMutation({
    mutationFn: (pts: number) => loyaltyApi.redeem(pts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-balance'] });
      qc.invalidateQueries({ queryKey: ['loyalty-history'] });
      setRedeemPoints('');
      setRedeemError('');
    },
    onError: (err: any) => {
      setRedeemError(err?.response?.data?.message || 'Redemption failed');
    },
  });

  const pts = balanceData?.points ?? 0;
  const rupeeValue = balanceData?.rupeeValue ?? 0;
  const totalPages = historyData?.total ? Math.ceil(historyData.total / 15) : 1;

  function handleRedeem() {
    const n = Number(redeemPoints);
    if (!n || n <= 0) { setRedeemError('Enter a valid number of points'); return; }
    if (n > pts) { setRedeemError('You don\'t have enough points'); return; }
    setRedeemError('');
    redeemMut.mutate(n);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white">
        <div className="max-w-xl mx-auto px-4 pt-10 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Star className="h-6 w-6" />
            <h1 className="text-xl font-bold">Loyalty Wallet</h1>
          </div>

          {balanceLoading ? (
            <div className="h-24 animate-pulse rounded-xl bg-white/10" />
          ) : (
            <div>
              <div className="text-5xl font-bold tracking-tight">{pts.toLocaleString()}</div>
              <div className="text-orange-200 mt-1">points</div>
              <div className="mt-3 text-sm bg-white/20 inline-block px-3 py-1.5 rounded-full">
                Worth <strong>Rs {rupeeValue.toLocaleString()}</strong> in discounts
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-8 space-y-5">

        {/* Redeem card */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Redeem Points</h2>
          <p className="text-xs text-gray-400 mb-4">Each point = Rs 0.50 discount on your next booking</p>

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                min={1}
                max={pts}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                placeholder="Enter points to redeem"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
              />
              {redeemPoints && Number(redeemPoints) > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  = Rs {(Number(redeemPoints) * 0.5).toFixed(0)} discount
                </p>
              )}
            </div>
            <button
              onClick={handleRedeem}
              disabled={redeemMut.isPending || !redeemPoints}
              className="bg-orange-600 text-white px-5 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {redeemMut.isPending ? 'Redeeming…' : 'Redeem'}
            </button>
          </div>

          {redeemError && (
            <div className="mt-2 flex items-center gap-1.5 text-red-500 text-xs">
              <AlertCircle className="h-3.5 w-3.5" /> {redeemError}
            </div>
          )}

          {redeemMut.isSuccess && (
            <div className="mt-2 text-green-600 text-xs font-medium">
              Points redeemed successfully!
            </div>
          )}
        </div>

        {/* How to earn card */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
          <h2 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
            <Gift className="h-4 w-4" /> How to Earn Points
          </h2>
          <div className="space-y-2 text-sm text-orange-700">
            <div className="flex justify-between">
              <span>Every Rs 10 spent on tickets</span>
              <strong>1 point</strong>
            </div>
            <div className="flex justify-between">
              <span>Refer a friend</span>
              <strong>50 points</strong>
            </div>
            <div className="flex justify-between">
              <span>First booking bonus</span>
              <strong>25 points</strong>
            </div>
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Transaction History</h2>
            <span className="text-xs text-gray-400">{historyData?.total ?? 0} records</span>
          </div>

          {historyLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-48" />
                    <div className="h-2 bg-gray-50 rounded animate-pulse w-24" />
                  </div>
                  <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : historyData?.data?.length === 0 ? (
            <div className="py-14 text-center text-gray-400">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1">Book a ticket to earn your first points!</p>
            </div>
          ) : (
            <div className="divide-y">
              {historyData?.data?.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {TX_ICON[tx.type] ?? <Star className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">
                      {tx.description || tx.type}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className={`font-semibold text-sm ${TX_COLOR[tx.type] ?? 'text-gray-700'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded border hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded border hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
