'use client';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { Ticket, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-green-50 text-green-700',
  PENDING_PAYMENT: 'bg-yellow-50 text-yellow-700',
  CANCELLED: 'bg-red-50 text-red-500',
  COMPLETED: 'bg-blue-50 text-blue-700',
};

export default function MyBookingsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingApi.getMyBookings(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Ticket size={24} className="text-orange-600" /> My Bookings
      </h1>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-slate-50" />)}</div>}

      {bookings?.length === 0 && (
        <div className="card text-center py-16">
          <Ticket size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500">No bookings yet. Search for buses and book your first trip!</p>
        </div>
      )}

      <div className="space-y-4">
        {bookings?.map((b: any) => (
          <div key={b.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono font-bold text-lg text-orange-600">{b.pnr}</div>
                <div className="text-sm text-slate-500 mt-1">
                  Seats: <span className="font-medium text-slate-700">{b.seatNumbers?.join(', ')}</span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  {new Date(b.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[b.status] || 'bg-slate-100 text-slate-500'}`}>
                  {b.status?.replace('_', ' ')}
                </span>
                <div className="font-bold text-lg mt-2">Rs {b.finalAmount?.toLocaleString() || b.totalAmount?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
