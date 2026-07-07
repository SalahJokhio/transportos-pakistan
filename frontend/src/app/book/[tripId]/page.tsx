'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tripApi, bookingApi } from '@/lib/api/endpoints';
import { useState } from 'react';
import { Check, Disc3, DoorClosed, Armchair } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

type Seat = { seatNumber: string; row: number; col: number; type?: string };

// A single seat, shaped like a seat-back, coloured by its live status.
function SeatButton({
  seat,
  status,
  gender,
  selected,
  onClick,
}: {
  seat: Seat;
  status: string;
  gender?: string;
  selected: boolean;
  onClick: () => void;
}) {
  const base =
    'relative w-9 h-10 rounded-t-lg rounded-b-sm text-[11px] font-semibold border transition-all flex items-center justify-center';
  const taken = status === 'BOOKED';
  const held = status === 'LOCKED';

  if (taken) {
    // Female-occupied seats are pink so a booker can seat by gender.
    const cls =
      gender === 'F'
        ? 'bg-pink-200 border-pink-300 text-pink-700'
        : gender === 'M'
          ? 'bg-blue-200 border-blue-300 text-blue-700'
          : 'bg-slate-300 border-slate-300 text-slate-500';
    return (
      <div
        title={`Seat ${seat.seatNumber} — booked${gender === 'F' ? ' (female)' : gender === 'M' ? ' (male)' : ''}`}
        className={`${base} ${cls} cursor-not-allowed`}
      >
        {seat.seatNumber}
      </div>
    );
  }
  if (held)
    return (
      <div
        title={`Seat ${seat.seatNumber} — on hold`}
        className={`${base} bg-amber-100 border-amber-300 text-amber-600 cursor-not-allowed`}
      >
        {seat.seatNumber}
      </div>
    );
  if (selected)
    return (
      <button
        onClick={onClick}
        title={`Seat ${seat.seatNumber} — selected`}
        className={`${base} bg-orange-500 border-orange-500 text-white shadow`}
      >
        {seat.seatNumber}
      </button>
    );
  return (
    <button
      onClick={onClick}
      title={`Seat ${seat.seatNumber} — ${seat.type || 'available'}`}
      className={`${base} bg-white border-slate-300 text-slate-600 hover:border-orange-400 hover:bg-orange-50`}
    >
      {seat.seatNumber}
    </button>
  );
}

const LEGEND: [string, string][] = [
  ['bg-white border-slate-300', 'Available'],
  ['bg-orange-500 border-orange-500', 'Selected'],
  ['bg-amber-100 border-amber-300', 'On hold'],
  ['bg-slate-300 border-slate-300', 'Booked'],
  ['bg-pink-200 border-pink-300', 'Female'],
];

export default function BookPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [gender, setGender] = useState<'M' | 'F'>('M');

  const { data: trip } = useQuery({ queryKey: ['trip', tripId], queryFn: () => tripApi.getById(tripId) });
  const { data: seatMap } = useQuery({ queryKey: ['seats', tripId], queryFn: () => tripApi.getSeatMap(tripId) });

  const lockMutation = useMutation({
    mutationFn: () => bookingApi.lockSeats({ tripId, seatNumbers: selected }),
    onSuccess: (res: any) => {
      if (res.success) router.push(`/checkout?tripId=${tripId}&seats=${selected.join(',')}&gender=${gender}`);
      else alert(res.message);
    },
  });

  const toggleSeat = (seatNumber: string, status: string) => {
    if (status === 'BOOKED' || status === 'LOCKED') return;
    setSelected((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber],
    );
  };

  if (!seatMap) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">Loading seat map…</div>;

  const availability: Record<string, string> = seatMap.seatAvailability || {};
  const seatsPerRow: number = seatMap.seatLayout?.seatsPerRow || 4;
  const half = Math.ceil(seatsPerRow / 2);

  // Build the real bus geometry from the bus layout; fall back to a simple grid.
  let layout: Seat[] = seatMap.seatLayout?.layout as Seat[] | undefined ?? [];
  if (!layout.length) {
    layout = Object.keys(availability).map((seatNumber, i) => ({
      seatNumber,
      row: Math.floor(i / seatsPerRow) + 1,
      col: (i % seatsPerRow) + 1,
    }));
  }

  const byRow = new Map<number, Seat[]>();
  layout.forEach((s) => {
    if (!byRow.has(s.row)) byRow.set(s.row, []);
    byRow.get(s.row)!.push(s);
  });
  const rowNums = [...byRow.keys()].sort((a, b) => a - b);

  const pricePer = Number(seatMap.basePrice ?? trip?.basePrice ?? 0);
  const available = Object.values(availability).filter((s) => s === 'AVAILABLE').length;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Select your seats</h1>
      <p className="text-slate-500 text-sm mb-5">
        {seatMap.busType && <span className="font-medium text-slate-600">{seatMap.busType} bus</span>} ·{' '}
        {available} seats available · Rs {pricePer.toLocaleString()}/seat
      </p>

      {/* Gender toggle — the booker's gender applies to the seats they pick. */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-500">Booking as:</span>
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          <button
            onClick={() => setGender('M')}
            className={`px-4 py-1.5 font-medium ${gender === 'M' ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Male
          </button>
          <button
            onClick={() => setGender('F')}
            className={`px-4 py-1.5 font-medium ${gender === 'F' ? 'bg-pink-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Female
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
        {LEGEND.map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-t-md rounded-b-sm border ${cls}`} />
            {label}
          </div>
        ))}
      </div>

      {/* The bus */}
      <div className="mx-auto w-fit bg-slate-50 border-2 border-slate-200 rounded-t-[2.5rem] rounded-b-2xl px-5 pt-5 pb-6">
        {/* Front: driver + door */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1.5 text-slate-400" title="Driver">
            <Disc3 size={26} />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 border border-dashed border-slate-300 rounded-md px-2 py-1">
            <DoorClosed size={12} /> Door
          </div>
        </div>

        {/* Seat rows: left block · aisle · right block */}
        <div className="space-y-2">
          {rowNums.map((rn) => {
            const seats = byRow.get(rn)!.slice().sort((a, b) => a.col - b.col);
            const left = seats.filter((s) => s.col <= half);
            const right = seats.filter((s) => s.col > half);
            const renderSeat = (s: Seat) => (
              <SeatButton
                key={s.seatNumber}
                seat={s}
                status={availability[s.seatNumber] || 'AVAILABLE'}
                gender={seatMap.seatGenders?.[s.seatNumber]}
                selected={selected.includes(s.seatNumber)}
                onClick={() => toggleSeat(s.seatNumber, availability[s.seatNumber] || 'AVAILABLE')}
              />
            );
            return (
              <div key={rn} className="flex items-center justify-center gap-1.5">
                {left.map(renderSeat)}
                <div className="w-6 text-center text-[9px] text-slate-300">▪</div>
                {right.map(renderSeat)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary + continue */}
      {selected.length > 0 && (
        <div className="card mt-6 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500 flex items-center gap-1.5"><Armchair size={15} /> Selected</span>
            <span className="font-medium">{selected.join(', ')}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-orange-600">Rs {(pricePer * selected.length).toLocaleString()}</span>
          </div>
        </div>
      )}

      <button
        disabled={selected.length === 0 || lockMutation.isPending}
        onClick={() => {
          if (!isAuthenticated) return router.push('/auth/login');
          lockMutation.mutate();
        }}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 mt-6"
      >
        <Check size={16} />
        {lockMutation.isPending
          ? 'Reserving…'
          : `Continue with ${selected.length} seat${selected.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
