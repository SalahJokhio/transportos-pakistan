'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { profileApi, bookingApi, walletApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { Repeat, Wallet, Navigation, Ticket, ChevronRight, Sparkles } from 'lucide-react';

/** Personalized passenger dashboard shown at the top of Home when logged in. */
export function PersonalizedHome() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { data: mem } = useQuery({ queryKey: ['home-memory'], queryFn: profileApi.memory, enabled: isAuthenticated });
  const { data: wallet } = useQuery({ queryKey: ['home-wallet'], queryFn: () => walletApi.get(), enabled: isAuthenticated });
  const { data: bookings } = useQuery({ queryKey: ['home-bookings'], queryFn: () => bookingApi.getMyBookings(), enabled: isAuthenticated });

  if (!isAuthenticated) return null;

  const upcoming = (Array.isArray(bookings) ? bookings : [])
    .filter((b: any) => ['CONFIRMED', 'PENDING_PAYMENT'].includes(b.status))
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

  const rebook = () => {
    if (!(mem as any)?.frequentRoute) return;
    const [origin, dest] = (mem as any).frequentRoute.split('→');
    const d = new Date(); d.setDate(d.getDate() + 1);
    router.push(`/search?originCity=${encodeURIComponent(origin)}&destinationCity=${encodeURIComponent(dest)}&date=${d.toISOString().slice(0, 10)}&passengers=1`);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 pt-6">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Assalam-o-Alaikum</div>
            <div className="text-xl font-bold text-slate-800">{user?.firstName || 'Traveller'} 👋</div>
          </div>
          <Link href="/wallet" className="text-right hover:opacity-80">
            <div className="text-xs text-slate-400 flex items-center gap-1 justify-end"><Wallet size={12} /> Wallet</div>
            <div className="font-bold text-slate-800">Rs {Number((wallet as any)?.balance ?? 0).toLocaleString()}</div>
          </Link>
        </div>

        {/* AI book-again suggestion */}
        {(mem as any)?.known && (mem as any)?.frequentRoute && (
          <button onClick={rebook} className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-50 to-indigo-50 border border-orange-100 p-3 flex items-center gap-3 text-left hover:from-orange-100">
            <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0"><Repeat size={16} /></div>
            <div className="min-w-0">
              <div className="text-xs text-orange-700 font-semibold flex items-center gap-1"><Sparkles size={11} /> Book again</div>
              <div className="text-sm font-medium text-slate-800 truncate">{(mem as any).frequentRoute} — your usual route</div>
            </div>
            <ChevronRight size={18} className="text-orange-400 ml-auto shrink-0" />
          </button>
        )}

        {/* Upcoming trip strip */}
        {upcoming && (
          <div className="mt-3 rounded-xl border border-slate-100 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Ticket size={16} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-400">Upcoming · {upcoming.status}</div>
              <div className="text-sm font-medium text-slate-800 truncate">PNR {upcoming.pnr} · seats {(upcoming.seatNumbers || []).join(', ')}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/booking/${upcoming.pnr}`} className="text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg">Ticket</Link>
              <Link href={`/track/${upcoming.tripId}`} className="text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Navigation size={12} /> Track</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
