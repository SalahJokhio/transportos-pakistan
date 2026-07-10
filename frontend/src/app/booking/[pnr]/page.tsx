'use client';
import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { bookingApi, driverApi } from '@/lib/api/endpoints';
import { disputesApi } from '@/lib/api/admin';
import { CheckCircle, Download, MapPin, Bus, Calendar, Ticket, Share2, Navigation, Star, AlertTriangle } from 'lucide-react';

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
    queryKey: ['ticket', pnr],
    queryFn: () => bookingApi.getTicket(pnr),
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

        {/* Route + bus details */}
        {b.route && (
          <div className="mt-5 border-t border-slate-100 pt-4 flex items-start gap-3 text-sm">
            <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">{b.route.originCity} → {b.route.destinationCity}</div>
              {b.bus && <div className="text-xs text-slate-400">{b.bus.busType} · {b.bus.make} {b.bus.model} · {b.bus.registrationNumber}</div>}
              {b.trip?.departureTime && (
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Calendar size={12} /> {new Date(b.trip.departureTime).toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scannable QR — verified at boarding */}
        <div className="mt-6 border-t border-dashed border-slate-200 pt-4 text-center">
          {b.qrCode ? (
            <img src={b.qrCode} alt={`Boarding QR for ${b.pnr}`} className="mx-auto w-40 h-40" />
          ) : (
            <div className="text-xs text-slate-400">QR unavailable</div>
          )}
          <div className="text-xs text-slate-400 mt-1 font-mono">{b.pnr}</div>
          <div className="text-[11px] text-slate-400">Show this QR to the conductor at boarding</div>
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

      {/* Rate the driver */}
      {b.trip?.driverId && ['CONFIRMED', 'COMPLETED'].includes(b.status) && (
        <RateDriver driverId={b.trip.driverId} tripId={b.tripId} />
      )}

      {/* Report an issue / request refund */}
      <RaiseDispute pnr={b.pnr} bookingId={b.id} />

      {/* Cancellation notice */}
      <div className="mt-4 text-xs text-slate-400 text-center">
        Free cancellation up to 2 hours before departure · Refund in 3-5 business days
      </div>
    </div>
  );
}

function RateDriver({ driverId, tripId }: { driverId: string; tripId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [remark, setRemark] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    try {
      await driverApi.review(driverId, { rating, remark, tripId });
      setDone(true);
    } catch {
      /* ignore — keep it simple */
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card mt-4 text-center py-6">
        <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">Thanks for your feedback!</p>
        <p className="text-xs text-slate-400 mt-1">Your remark is now part of the driver&apos;s record.</p>
      </div>
    );
  }

  return (
    <div className="card mt-4">
      <h3 className="font-bold mb-1">Rate your driver</h3>
      <p className="text-xs text-slate-400 mb-3">Your rating follows the driver on their permanent record.</p>
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="transition-transform hover:scale-110"
          >
            <Star size={34} className={(hover || rating) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
          </button>
        ))}
      </div>
      <textarea
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="Add a remark (optional) — e.g. safe driving, on time…"
        className="input w-full text-sm mb-3"
        rows={2}
      />
      <button onClick={submit} disabled={!rating || busy} className="btn-primary w-full disabled:opacity-40">
        {busy ? 'Submitting…' : 'Submit rating'}
      </button>
    </div>
  );
}

function RaiseDispute({ pnr, bookingId }: { pnr: string; bookingId?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('COMPLAINT');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim()) return;
    setBusy(true);
    try {
      await disputesApi.raise({ type, subject, description, pnr, bookingId });
      setDone(true);
    } catch {
      /* keep simple */
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card mt-4 text-center py-6">
        <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">Your request has been submitted</p>
        <p className="text-xs text-slate-400 mt-1">Our team will review it and get back to you.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-3 text-sm font-medium transition-colors"
      >
        <AlertTriangle size={15} /> Report an issue / Request refund
      </button>
    );
  }

  return (
    <div className="card mt-4">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500" /> Report an issue
      </h3>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { v: 'COMPLAINT', l: 'Complaint' },
          { v: 'REFUND_REQUEST', l: 'Refund' },
          { v: 'FRAUD', l: 'Fraud' },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => setType(o.v)}
            className={`text-xs font-medium py-2 rounded-lg border transition-colors ${
              type === o.v ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject — e.g. Bus was 2 hours late"
        className="input w-full text-sm mb-2"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what happened (optional)"
        className="input w-full text-sm mb-3"
        rows={3}
      />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button onClick={submit} disabled={!subject.trim() || busy} className="btn-primary flex-1 disabled:opacity-40">
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
