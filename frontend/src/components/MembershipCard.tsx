'use client';
import { useQuery } from '@tanstack/react-query';
import { loyaltyApi } from '@/lib/api/loyalty';
import { useAuthStore } from '@/store/auth.store';
import { Crown, Check } from 'lucide-react';

const TIER_STYLE: Record<string, { grad: string; text: string }> = {
  Bronze: { grad: 'linear-gradient(135deg,#7c5a3a,#a97c50)', text: 'text-amber-100' },
  Silver: { grad: 'linear-gradient(135deg,#6b7280,#9ca3af)', text: 'text-slate-100' },
  Gold: { grad: 'linear-gradient(135deg,#b45309,#f59e0b)', text: 'text-amber-50' },
  Platinum: { grad: 'linear-gradient(135deg,#1e293b,#4f46e5)', text: 'text-indigo-100' },
};

/** Membership tier card — tier, progress to next, benefits (B1-Ch7/9). */
export function MembershipCard() {
  const { isAuthenticated } = useAuthStore();
  const { data: t } = useQuery({ queryKey: ['loyalty-tier'], queryFn: loyaltyApi.getTier, enabled: isAuthenticated });
  if (!t) return null;
  const style = TIER_STYLE[t.tier] ?? TIER_STYLE.Bronze;

  return (
    <div className="rounded-2xl p-5 text-white mb-5" style={{ background: style.grad }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown size={18} className={style.text} />
          <span className="font-bold text-lg">{t.tier} Member</span>
        </div>
        <span className={`text-xs ${style.text}`}>{t.multiplier}× points</span>
      </div>

      {t.nextTier ? (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1 opacity-90">
            <span>{t.lifetimePoints.toLocaleString()} pts</span>
            <span>{t.pointsToNext.toLocaleString()} to {t.nextTier}</span>
          </div>
          <div className="h-2 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${t.progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs opacity-90">Top tier reached — {t.lifetimePoints.toLocaleString()} lifetime points 🎉</div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
        {t.benefits.map((b: string) => (
          <div key={b} className={`text-xs flex items-center gap-1 ${style.text}`}><Check size={12} /> {b}</div>
        ))}
      </div>
    </div>
  );
}
