'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tripApi, bookingApi } from '@/lib/api/endpoints';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

function SeatButton({ seat, status, selected, onClick }: any) {
  const base = 'w-10 h-10 rounded-lg text-xs font-semibold border-2 transition-all';
  if (status === 'BOOKED' || status === 'LOCKED')
    return <div className={`${base} bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed flex items-center justify-center`}>{seat}</div>;
  if (selected)
    return <button onClick={onClick} className={`${base} bg-orange-500 border-orange-500 text-white`}>{seat}</button>;
  return <button onClick={onClick} className={`${base} bg-white border-slate-300 hover:border-orange-400 text-slate-700`}>{seat}</button>;
}

export default function BookPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);

  const { data: trip } = useQuery({ queryKey: ['trip', tripId], queryFn: () => tripApi.getById(tripId) });
  const { data: seatMap } = useQuery({ queryKey: ['seats', tripId], queryFn: () => tripApi.getSeatMap(tripId) });

  const lockMutation = useMutation({
    mutationFn: () => bookingApi.lockSeats({ tripId, seatNumbers: selected }),
    onSuccess: (res: any) => {
      if (res.success) router.push(`/checkout?tripId=${tripId}&seats=${selected.join(',')}`);
      else alert(res.message);
    },
  });

  const toggleSeat = (seat: string) => {
    setSelected((prev) => prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]);
  };

  if (!seatMap) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">Loading seat map...</div>;

  const seats = Object.entries(seatMap.seatAvailability || {});
  const seatsPerRow = 4;
  const rows: string[][] = [];
  for (let i = 0; i < seats.length; i += seatsPerRow) {
    rows.push(seats.slice(i, i + seatsPerRow).map(([k]) => k));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Select Your Seats</h1>
      <p className="text-slate-500 text-sm mb-8">Click available seats to select them</p>

      <div className="card mb-6">
        {/* Legend */}
        <div className="flex gap-6 text-xs text-slate-500 mb-6">
          {[['bg-white border-slate-300', 'Available'], ['bg-orange-500', 'Selected'], ['bg-slate-100 border-slate-200', 'Booked']].map(([cls, label]) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded border-2 ${cls}`} />
              {label}
            </div>
          ))}
        </div>

        {/* Driver row */}
        <div className="flex justify-end mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-800 text-white text-xs flex items-center justify-center">Driver</div>
        </div>

        {/* Seat grid */}
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 justify-center">
              {row.map((seat, j) => (
                <>
                  {j === 2 && <div key="aisle" className="w-6" />}
                  <SeatButton
                    key={seat}
                    seat={seat}
                    status={seatMap.seatAvailability[seat]}
                    selected={selected.includes(seat)}
                    onClick={() => toggleSeat(seat)}
                  />
                </>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selected.length > 0 && (
        <div className="card mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Selected seats</span>
            <span className="font-medium">{selected.join(', ')}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-orange-600">Rs {((trip?.basePrice || 0) * selected.length).toLocaleString()}</span>
          </div>
        </div>
      )}

      <button
        disabled={selected.length === 0 || lockMutation.isPending}
        onClick={() => {
          if (!isAuthenticated) return router.push('/auth/login');
          lockMutation.mutate();
        }}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Check size={16} />
        {lockMutation.isPending ? 'Reserving...' : `Continue with ${selected.length} seat${selected.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
