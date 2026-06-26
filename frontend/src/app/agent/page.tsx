'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripApi, bookingApi, agentApi, paymentApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { Ticket, Wallet, Search, CheckCircle, MapPin } from 'lucide-react';

export default function AgentPage() {
  const { isAuthenticated } = useAuthStore();

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['agent-summary'],
    queryFn: () => agentApi.summary(),
    enabled: isAuthenticated,
  });

  const [q, setQ] = useState({ originCity: '', destinationCity: '', date: '' });
  const [trips, setTrips] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ seats: '', name: '', phone: '' });
  const [issued, setIssued] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setError(''); setIssued(null); setSelected(null);
    try {
      const res = await tripApi.search(q);
      setTrips(Array.isArray(res) ? res : []);
    } catch (e: any) { setError(e.message); }
  };

  const issue = async () => {
    setError(''); setIssued(null);
    const seatNumbers = form.seats.split(',').map((s) => s.trim()).filter(Boolean);
    if (!selected || !seatNumbers.length || !form.name) { setError('Pick a trip, enter seats and customer name'); return; }
    setBusy(true);
    try {
      // Agent must hold the seat lock before booking on the customer's behalf.
      const lock: any = await bookingApi.lockSeats({ tripId: selected.id, seatNumbers });
      if (!lock.success) throw new Error(lock.message || 'Seats not available');
      const booking: any = await agentApi.book({
        tripId: selected.id,
        seatNumbers,
        passengerDetails: seatNumbers.map((s) => ({ name: form.name, seatNumber: s })),
      });
      // Walk-in = cash collected now → settle immediately.
      await paymentApi.mockConfirm(booking.id);
      setIssued(booking.pnr);
      setForm({ seats: '', name: '', phone: '' });
      refetchSummary();
    } catch (e: any) { setError(e.message || 'Could not issue ticket'); }
    finally { setBusy(false); }
  };

  if (!isAuthenticated) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500">Please log in as an agent.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Ticket className="text-orange-600" size={22} /> Agent Desk</h1>

      {/* Commission summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Ticket size={15} /> Tickets Issued</div>
          <div className="text-2xl font-bold">{summary?.ticketsIssued ?? 0}</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Wallet size={15} /> Commission (5%)</div>
          <div className="text-2xl font-bold text-orange-600">Rs {(summary?.commission ?? 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Issue walk-in ticket */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">Issue Walk-in Ticket</h2>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <input className="input" placeholder="From (e.g. Karachi)" value={q.originCity} onChange={(e) => setQ({ ...q, originCity: e.target.value })} />
          <input className="input" placeholder="To (e.g. Lahore)" value={q.destinationCity} onChange={(e) => setQ({ ...q, destinationCity: e.target.value })} />
          <input className="input" type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} />
        </div>
        <button onClick={search} className="btn-primary flex items-center gap-2 text-sm mb-4"><Search size={15} /> Search trips</button>

        {trips.length > 0 && (
          <div className="space-y-2 mb-4">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left border rounded-xl p-3 text-sm flex justify-between items-center transition-all ${selected?.id === t.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
              >
                <span className="flex items-center gap-2"><MapPin size={14} className="text-orange-500" /> {new Date(t.departureTime).toLocaleString('en-PK', { hour: '2-digit', minute: '2-digit' })} · {t.availableSeats} seats</span>
                <span className="font-semibold text-orange-600">Rs {t.basePrice?.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <input className="input" placeholder="Seats e.g. 01,02" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
            <input className="input" placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Customer phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-3">{error}</div>}
        {issued && (
          <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3 mb-3 flex items-center gap-2">
            <CheckCircle size={16} /> Ticket issued — PNR <span className="font-mono font-bold">{issued}</span>
          </div>
        )}

        <button onClick={issue} disabled={!selected || busy} className="btn-primary w-full disabled:opacity-40">
          {busy ? 'Issuing…' : 'Issue Ticket (cash)'}
        </button>
      </div>
    </div>
  );
}
