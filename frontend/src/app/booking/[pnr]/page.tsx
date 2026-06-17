'use client';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api/endpoints';
import { CheckCircle, Download, MapPin, Bus, Calendar, Ticket, Share2, Navigation } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: 'text-green-600 bg-green-50',
  PENDING_PAYMENT: 'text-yellow-600 bg-yellow-50',
  CANCELLED: 'text-red-500 bg-red-50',
  COMPLETED: 'text-blue-600 bg-blue-50',
};

export default function BookingConfirmationPage() {
  const { pnr } = useParams<{ pnr: string }>();
  const sp = useSearchParams();
  const justConfirmed = sp.get('confirmed') === '1';

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-pnr', pnr],
    queryFn: () => bookingApi.getByPnr(pnr),
    enabled: !!pnr,
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-slate-500">
        Booking not found. Check your PNR and try again.
      </div>
    );
  }

  const b = booking as any;

  const handlePrint = () => window.print();
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'My Bus Ticket', text: `PNR: ${pnr}`, url: window.location.href });
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {justConfirmed && (
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-green-700">Booking Confirmed!</h1>
          <p className="text-slate-500 text-sm mt-1">SMS sent to your registered phone number</p>
        </div>
      )}

      {/* Ticket card */}
      <div className="card border-2 border-dashed border-orange-200 print:shadow-none" id="ticket">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-orange-600 font-bold text-xl">
              <Bus size={20} /> TransportOS
            </div>
            <div className="text-xs text-slate-400 mt-0.5">E-Ticket</div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[b.status] || 'bg-slate-100 text-slate-500'}`}>
            {b.status?.replace('_', ' ')}
          </span>
        </div>

        {/* PNR */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5 text-center">
          <div className="text-xs text-slate-400 mb-1">PNR / Booking Reference</div>
          <div className="font-mono font-bold text-2xl tracking-widest text-orange-600">{b.pnr}</div>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Ticket size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-400">Seats</div>
              <div className="font-semibold">{b.seatNumbers?.join(', ')}</div>
            </div>
          </div>

          {b.passengerDetails?.map((p: any, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-4 shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Seat {p.seatNumber} — Passenger</div>
                <div className="font-medium">{p.name}</div>
                {p.cnic && <div className="text-xs text-slate-400">{p.cnic}</div>}
              </div>
            </div>
          ))}

          <div className="border-t border-slate-100 pt-3 flex justify-between">
            <span className="text-slate-500">Amount Paid</span>
            <span className="font-bold text-orange-600">Rs {(b.finalAmount || b.totalAmount || 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Booked on</span>
            <span>{new Date(b.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Barcode placeholder */}
        <div className="mt-6 border-t border-dashed border-slate-200 pt-4 text-center">
          <div className="inline-flex gap-0.5">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                style={{ width: 2, height: Math.random() > 0.5 ? 32 : 20 }}
                className="bg-slate-800 rounded-sm"
              />
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">{b.pnr}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button onClick={handlePrint} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2">
          <Download size={15} /> Download
        </button>
        <button onClick={handleShare} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2">
          <Share2 size={15} /> Share
        </button>
      </div>

      {/* Track bus button — only for active bookings */}
      {b.tripId && ['CONFIRMED', 'PENDING_PAYMENT'].includes(b.status) && (
        <Link
          href={`/track/${b.tripId}`}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          <Navigation size={16} /> Track Live Location
        </Link>
      )}

      {/* Cancellation notice */}
      <div className="mt-4 text-xs text-slate-400 text-center">
        Free cancellation up to 2 hours before departure · Refund in 3-5 business days
      </div>
    </div>
  );
}
