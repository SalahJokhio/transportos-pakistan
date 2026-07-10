'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripApi, bookingApi, agentApi, paymentApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { Ticket, Wallet, Search, CheckCircle, MapPin, ArrowRight, User, Phone, Loader2 } from 'lucide-react';

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
  const [seatMap, setSeatMap] = useState<any>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [cust, setCust] = useState({ name: '', phone: '' });
  const [issued, setIssued] = useState<{ pnr: string; seats: string[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setError(''); setIssued(null); setSelected(null); setSeatMap(null); setPicked([]);
    try {
      const res = await tripApi.search(q);
      setTrips(Array.isArray(res) ? res : []);
    } catch (e: any) { setError(e.message); }
  };

  const pickTrip = async (t: any) => {
    setSelected(t); setPicked([]); setSeatMap(null); setError('');
    try {
      setSeatMap(await tripApi.getSeatMap(t.id));
    } catch { /* ignore */ }
  };

  const toggleSeat = (s: string, status: string) => {
    if (status === 'BOOKED' || status === 'LOCKED') return;
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const issue = async () => {
    setError('');
    if (!selected || !picked.length || !cust.name) { setError('Pick a trip, seats and enter the customer name'); return; }
    setBusy(true);
    try {
      const lock: any = await bookingApi.lockSeats({ tripId: selected.id, seatNumbers: picked });
      if (!lock.success) throw new Error(lock.message || 'Seats just taken — pick again');
      const booking: any = await agentApi.book({
        tripId: selected.id,
        seatNumbers: picked,
        passengerDetails: picked.map((s) => ({ name: cust.name, seatNumber: s })),
      });
      await paymentApi.mockConfirm(booking.id); // walk-in = cash now
      setIssued({ pnr: booking.pnr, seats: picked });
      setSelected(null); setSeatMap(null); setPicked([]); setCust({ name: '', phone: '' });
      refetchSummary();
    } catch (e: any) { setError(e.message || 'Could not issue ticket'); }
    finally { setBusy(false); }
  };

  if (!isAuthenticated) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">Please log in as an agent.</div>;
  }

  const total = selected ? (Number(selected.basePrice) * picked.length) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header + commission (catchy gradient) */}
      <div className="rounded-2xl p-5 mb-6 text-white" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center"><Ticket size={20} /></div>
          <div>
            <div className="font-bold text-lg leading-tight">Booker Desk</div>
            <div className="text-white/50 text-xs">Issue walk-in tickets · live seats</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-2xl font-extrabold">{summary?.ticketsIssued ?? 0}</div>
            <div className="text-white/50 text-[11px]">Tickets issued</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-2xl font-extrabold">Rs {(summary?.totalSales ?? 0).toLocaleString()}</div>
            <div className="text-white/50 text-[11px]">Sales</div>
          </div>
          <div className="rounded-xl bg-orange-500/15 border border-orange-500/25 p-3">
            <div className="text-2xl font-extrabold text-orange-400 flex items-center gap-1"><Wallet size={16} /> {(summary?.commission ?? 0).toLocaleString()}</div>
            <div className="text-orange-300/70 text-[11px]">Commission (5%)</div>
          </div>
        </div>
      </div>

      {issued && (
        <div className="card mb-5 bg-green-50 border-green-200 flex items-center gap-3">
          <CheckCircle className="text-green-500 shrink-0" size={26} />
          <div>
            <div className="font-bold text-green-700">Ticket issued — PNR <span className="font-mono">{issued.pnr}</span></div>
            <div className="text-sm text-green-600">Seats {issued.seats.join(', ')} · cash collected</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card mb-5">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <input className="input" placeholder="From" value={q.originCity} onChange={(e) => setQ({ ...q, originCity: e.target.value })} />
          <input className="input" placeholder="To" value={q.destinationCity} onChange={(e) => setQ({ ...q, destinationCity: e.target.value })} />
          <input className="input" type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} />
        </div>
        <button onClick={search} className="btn-primary flex items-center gap-2 text-sm"><Search size={15} /> Search buses</button>
      </div>

      {error && <div className="card mb-5 text-red-600 text-sm py-3">{error}</div>}

      {/* Results */}
      {trips.length > 0 && !selected && (
        <div className="space-y-2 mb-5">
          {trips.map((t) => (
            <button key={t.id} onClick={() => pickTrip(t)}
              className="w-full text-left card hover:border-orange-300 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-orange-500" />
                <div>
                  <div className="font-semibold">{new Date(t.departureTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} · {t.busType || 'AC'}</div>
                  <div className="text-xs text-slate-400">{t.availableSeats} seats available</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-600">Rs {t.basePrice?.toLocaleString()}</span>
                <ArrowRight size={16} className="text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Visual seat picker + issue */}
      {selected && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold">Pick seats</div>
            <button onClick={() => { setSelected(null); setSeatMap(null); }} className="text-xs text-slate-400 hover:text-slate-600">← change bus</button>
          </div>

          {!seatMap ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> loading seats…</div>
          ) : (
            <SeatGrid seatMap={seatMap} picked={picked} onToggle={toggleSeat} />
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="relative">
              <User size={15} className="absolute left-3 top-3.5 text-slate-400" />
              <input className="input pl-9" placeholder="Customer name" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} />
            </div>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-3.5 text-slate-400" />
              <input className="input pl-9" placeholder="Customer phone" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 mb-3">
            <span className="text-sm text-slate-500">{picked.length} seat{picked.length !== 1 ? 's' : ''} · {picked.join(', ') || '—'}</span>
            <span className="text-lg font-bold text-orange-600">Rs {total.toLocaleString()}</span>
          </div>
          <button onClick={issue} disabled={busy || !picked.length} className="btn-primary w-full disabled:opacity-40">
            {busy ? 'Issuing…' : 'Issue ticket (cash)'}
          </button>
        </div>
      )}
    </div>
  );
}

function SeatGrid({ seatMap, picked, onToggle }: any) {
  const avail: Record<string, string> = seatMap.seatAvailability || {};
  const spr = seatMap.seatLayout?.seatsPerRow || 4;
  const half = Math.ceil(spr / 2);
  let layout: any[] = seatMap.seatLayout?.layout ?? [];
  if (!layout.length) layout = Object.keys(avail).map((seatNumber, i) => ({ seatNumber, row: Math.floor(i / spr) + 1, col: (i % spr) + 1 }));
  const byRow = new Map<number, any[]>();
  layout.forEach((s) => { if (!byRow.has(s.row)) byRow.set(s.row, []); byRow.get(s.row)!.push(s); });
  const rows = [...byRow.keys()].sort((a, b) => a - b);

  const seat = (s: any) => {
    const st = avail[s.seatNumber] || 'AVAILABLE';
    const sel = picked.includes(s.seatNumber);
    let cls = 'bg-white border-slate-300 text-slate-600 hover:border-orange-400';
    if (st === 'BOOKED') cls = 'bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed';
    else if (st === 'LOCKED') cls = 'bg-amber-100 border-amber-300 text-amber-600 cursor-not-allowed';
    else if (sel) cls = 'bg-orange-500 border-orange-500 text-white';
    return (
      <button key={s.seatNumber} onClick={() => onToggle(s.seatNumber, st)}
        className={`w-8 h-9 rounded-t-lg rounded-b-sm text-[10px] font-semibold border ${cls}`}>{s.seatNumber}</button>
    );
  };

  return (
    <div className="mx-auto w-fit bg-slate-50 border-2 border-slate-200 rounded-t-3xl rounded-b-xl px-4 pt-4 pb-5">
      <div className="flex justify-between mb-3 text-slate-300 text-[10px]"><span>◎</span><span>Door</span></div>
      <div className="space-y-1.5">
        {rows.map((rn) => {
          const seats = byRow.get(rn)!.slice().sort((a, b) => a.col - b.col);
          return (
            <div key={rn} className="flex items-center justify-center gap-1.5">
              {seats.filter((s) => s.col <= half).map(seat)}
              <div className="w-4" />
              {seats.filter((s) => s.col > half).map(seat)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
