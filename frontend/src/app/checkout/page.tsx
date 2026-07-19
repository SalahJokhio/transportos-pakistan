'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { bookingApi, paymentApi, tripApi, couponApi } from '@/lib/api/endpoints';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Phone, User, Shield, ChevronRight } from 'lucide-react';
import { formatCnicInput, isCnicValid } from '@/lib/cnic';
import { redirectToGateway } from '@/lib/payment/redirectToGateway';

type PaymentMethod = 'jazzcash' | 'easypaisa' | 'wallet';

export default function CheckoutPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const tripId = sp.get('tripId') || '';
  const seats = (sp.get('seats') || '').split(',').filter(Boolean);
  const defaultGender = (sp.get('gender') === 'F' ? 'F' : 'M') as 'M' | 'F';

  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripApi.getById(tripId),
    enabled: !!tripId,
  });

  const [passengers, setPassengers] = useState(
    seats.map((s) => ({ seatNumber: s, name: '', cnic: '', gender: defaultGender })),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const basePrice = trip?.basePrice || 0;
  const subtotal = basePrice * seats.length;
  const gst = Math.round(subtotal * 0.16);
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState('');
  const total = Math.max(0, subtotal + gst - discount);
  // Stable idempotency key for this checkout — a double-tapped "Book" reuses it
  // so the server returns the original booking instead of creating a duplicate.
  const [idempotencyKey] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bk-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  );

  const applyPromo = async () => {
    setPromoMsg('');
    try {
      const res: any = await couponApi.validate(promo, subtotal + gst);
      if (res?.valid) { setDiscount(res.discount); setPromoMsg(`− Rs ${res.discount} applied`); }
      else { setDiscount(0); setPromoMsg(res?.message || 'Invalid code'); }
    } catch { setDiscount(0); setPromoMsg('Could not validate code'); }
  };

  const updatePassenger = (i: number, field: string, value: string) => {
    setPassengers((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const handleCheckout = async () => {
    if (passengers.some((p) => !p.name)) { setError('Please enter name for all passengers'); return; }
    setError('');
    setLoading(true);

    try {
      // 1. Create the booking (PENDING_PAYMENT). Seats were locked on the
      //    previous screen, so this passes the lock-ownership check.
      const booking: any = await bookingApi.create({
        tripId,
        seatNumbers: seats,
        passengerDetails: passengers,
        promoCode: discount > 0 ? promo : undefined,
        idempotencyKey,
      });

      if (paymentMethod === 'wallet') {
        // 2a. Pay straight from the wallet balance (debits + confirms).
        await paymentApi.payWithWallet(booking.id);
      } else {
        // 2b. Start the gateway payment.
        const gw: any = await paymentApi.initiate({ bookingId: booking.id, method: paymentMethod });
        if (gw?.live) {
          // Real gateway: hand off to JazzCash/EasyPaisa. The gateway returns the
          // user to our callback, which confirms the booking and shows the ticket.
          redirectToGateway(gw);
          return; // browser is navigating away
        }
        // Sandbox (no live creds yet): simulate a successful settlement.
        await paymentApi.mockConfirm(booking.id);
      }

      // 3. Done — show the e-ticket.
      router.push(`/booking/${booking.pnr}?confirmed=1`);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left — forms */}
        <div className="md:col-span-2 space-y-6">

          {/* Passenger details */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <User size={18} className="text-orange-600" /> Passenger Details
            </h2>
            <div className="space-y-5">
              {passengers.map((p, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-500">Seat {p.seatNumber}</div>
                    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => updatePassenger(i, 'gender', 'M')}
                        className={`px-3 py-1 font-medium ${p.gender === 'M' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePassenger(i, 'gender', 'F')}
                        className={`px-3 py-1 font-medium ${p.gender === 'F' ? 'bg-pink-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                      <input
                        className="input"
                        placeholder="Ali Ahmed"
                        value={p.name}
                        onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">CNIC (optional)</label>
                      <input
                        className={`input ${p.cnic && !isCnicValid(p.cnic) ? 'border-red-300 focus:border-red-400' : ''}`}
                        placeholder="35202-1234567-1"
                        value={p.cnic}
                        maxLength={15}
                        onChange={(e) => updatePassenger(i, 'cnic', formatCnicInput(e.target.value))}
                      />
                      {p.cnic && !isCnicValid(p.cnic) && (
                        <p className="text-xs text-red-500 mt-1">Enter 13-digit CNIC</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-orange-600" /> Payment Method
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {([
                { id: 'wallet', label: 'Wallet', color: 'text-slate-800', bg: 'bg-slate-100 border-slate-300' },
                { id: 'jazzcash', label: 'JazzCash', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                { id: 'easypaisa', label: 'EasyPaisa', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`border-2 rounded-xl p-4 text-left transition-all ${
                    paymentMethod === m.id ? m.bg + ' border-current' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`font-bold text-lg ${paymentMethod === m.id ? m.color : 'text-slate-700'}`}>{m.label}</div>
                  <div className="text-xs text-slate-400 mt-1">Mobile wallet</div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <Shield size={12} /> Payments are secured and encrypted
            </div>
          </div>
        </div>

        {/* Right — summary */}
        <div>
          <div className="card sticky top-20">
            <h2 className="font-bold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{seats.length} seat{seats.length > 1 ? 's' : ''} × Rs {basePrice.toLocaleString()}</span>
                <span>Rs {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST (16%)</span>
                <span>Rs {gst.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Promo discount</span>
                  <span>− Rs {discount.toLocaleString()}</span>
                </div>
              )}
              {/* Promo code */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value.toUpperCase())}
                    placeholder="Promo code"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase"
                  />
                  <button type="button" onClick={applyPromo}
                    className="px-3 py-2 text-sm font-medium bg-slate-100 rounded-lg hover:bg-slate-200">Apply</button>
                </div>
                {promoMsg && <div className={`text-xs mt-1 ${discount > 0 ? 'text-green-600' : 'text-red-500'}`}>{promoMsg}</div>}
              </div>
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-orange-600">Rs {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
              Seats: <span className="font-medium text-slate-600">{seats.join(', ')}</span>
            </div>

            {error && <div className="mt-3 text-xs text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>Pay via {paymentMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} <ChevronRight size={16} /></>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              By proceeding, you agree to our cancellation policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
