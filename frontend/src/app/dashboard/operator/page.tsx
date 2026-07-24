'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operatorApi } from '@/lib/api/operator';
import { downloadPdf } from '@/lib/downloadPdf';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bus, MapPin, Calendar, BarChart3, Plus, CheckCircle, AlertCircle, Navigation,
  Building2, Repeat, Trash2, RefreshCw, Radio,
} from 'lucide-react';
import { DispatchBoard } from '@/components/operator/DispatchBoard';

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }[]> = {
  SCHEDULED: [{ next: 'BOARDING', label: 'Start Boarding', color: 'bg-yellow-500 text-white' }, { next: 'CANCELLED', label: 'Cancel', color: 'bg-red-500 text-white' }],
  BOARDING:  [{ next: 'DEPARTED', label: 'Mark Departed', color: 'bg-orange-500 text-white' }],
  DEPARTED:  [{ next: 'IN_TRANSIT', label: 'In Transit', color: 'bg-blue-500 text-white' }],
  IN_TRANSIT:[{ next: 'ARRIVED', label: 'Mark Arrived', color: 'bg-green-500 text-white' }],
  ARRIVED:   [],
  CANCELLED: [],
  DELAYED:   [{ next: 'DEPARTED', label: 'Resume', color: 'bg-orange-500 text-white' }],
};

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:  'bg-blue-100 text-blue-700',
  BOARDING:   'bg-yellow-100 text-yellow-700',
  DEPARTED:   'bg-orange-100 text-orange-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  ARRIVED:    'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-600',
  DELAYED:    'bg-amber-100 text-amber-700',
};

type Tab = 'overview' | 'dispatch' | 'routes' | 'buses' | 'trips' | 'schedules' | 'terminals';

// ── small form helpers ──────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Add Route Form ──────────────────────────────────────────────────
function AddRouteForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', originCity: '', destinationCity: '', distanceKm: '', estimatedMinutes: '' });
  // Comma-separated "Name @ time" points; parsed into {name, time} on submit.
  const [boarding, setBoarding] = useState('');
  const [dropping, setDropping] = useState('');
  const qc = useQueryClient();

  const parsePoints = (raw: string) =>
    raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const [name, time] = s.split('@').map((x) => x.trim());
      return time ? { name, time } : { name };
    });

  const mut = useMutation({
    mutationFn: () => operatorApi.createRoute({
      ...form,
      distanceKm: Number(form.distanceKm),
      estimatedMinutes: Number(form.estimatedMinutes),
      boardingPoints: parsePoints(boarding),
      droppingPoints: parsePoints(dropping),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['op-routes'] }); onSuccess(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Add New Route</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Route Name"><input className="input" placeholder="Lahore - Karachi Express" onChange={set('name')} /></Field>
        <Field label="Origin City"><input className="input" placeholder="Lahore" onChange={set('originCity')} /></Field>
        <Field label="Destination City"><input className="input" placeholder="Karachi" onChange={set('destinationCity')} /></Field>
        <Field label="Distance (km)"><input className="input" type="number" placeholder="1220" onChange={set('distanceKm')} /></Field>
        <Field label="Est. Duration (minutes)"><input className="input" type="number" placeholder="1080" onChange={set('estimatedMinutes')} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3 mb-3">
        <Field label="Boarding points (comma-separated, optional “Name @ 08:00”)">
          <input className="input" placeholder="Kalma Chowk @ 08:00, Thokar Niaz Baig @ 08:30" value={boarding} onChange={(e) => setBoarding(e.target.value)} />
        </Field>
        <Field label="Drop-off points (comma-separated)">
          <input className="input" placeholder="Sohrab Goth, Saddar" value={dropping} onChange={(e) => setDropping(e.target.value)} />
        </Field>
      </div>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="btn-primary text-sm py-2"
      >
        {mut.isPending ? 'Saving...' : 'Add Route'}
      </button>
      {mut.isSuccess && <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><CheckCircle size={12} /> Route added!</p>}
      {mut.isError && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> Failed. Try again.</p>}
    </div>
  );
}

// ── Add Bus Form ────────────────────────────────────────────────────
function AddBusForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ registrationNumber: '', busType: 'AC', make: '', model: '', manufacturingYear: '', totalSeats: '' });
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => operatorApi.createBus({
      ...form,
      manufacturingYear: Number(form.manufacturingYear),
      totalSeats: Number(form.totalSeats),
      seatLayout: generateLayout(Number(form.totalSeats)),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['op-buses'] }); onSuccess(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Register New Bus</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Registration No."><input className="input" placeholder="LHR-1234" onChange={set('registrationNumber')} /></Field>
        <Field label="Bus Type">
          <select className="input" onChange={set('busType')}>
            {['AC', 'NON_AC', 'SLEEPER', 'BUSINESS', 'MINIBUS'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Make (Manufacturer)"><input className="input" placeholder="Yutong" onChange={set('make')} /></Field>
        <Field label="Model"><input className="input" placeholder="ZK6122H9" onChange={set('model')} /></Field>
        <Field label="Year"><input className="input" type="number" placeholder="2022" onChange={set('manufacturingYear')} /></Field>
        <Field label="Total Seats"><input className="input" type="number" placeholder="44" onChange={set('totalSeats')} /></Field>
      </div>
      <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary text-sm py-2">
        {mut.isPending ? 'Registering...' : 'Register Bus'}
      </button>
      {mut.isSuccess && <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><CheckCircle size={12} /> Bus registered!</p>}
    </div>
  );
}

// ── Add Trip Form ───────────────────────────────────────────────────
function AddTripForm({ routes, buses, onSuccess }: { routes: any[]; buses: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ routeId: '', busId: '', driverId: '', departureTime: '', basePrice: '' });
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => operatorApi.createTrip({ ...form, basePrice: Number(form.basePrice), driverId: form.driverId || 'unassigned' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['op-trips'] }); onSuccess(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Schedule New Trip</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Route">
          <select className="input" onChange={set('routeId')}>
            <option value="">Select route</option>
            {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Bus">
          <select className="input" onChange={set('busId')}>
            <option value="">Select bus</option>
            {buses.map((b: any) => <option key={b.id} value={b.id}>{b.registrationNumber} ({b.busType})</option>)}
          </select>
        </Field>
        <Field label="Departure Date & Time"><input className="input" type="datetime-local" onChange={set('departureTime')} /></Field>
        <Field label="Base Price (PKR)"><input className="input" type="number" placeholder="1200" onChange={set('basePrice')} /></Field>
        <Field label="Driver ID (optional)"><input className="input" placeholder="Driver user ID" onChange={set('driverId')} /></Field>
      </div>
      <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary text-sm py-2">
        {mut.isPending ? 'Scheduling...' : 'Schedule Trip'}
      </button>
      {mut.isSuccess && <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><CheckCircle size={12} /> Trip scheduled!</p>}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────
export default function OperatorDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [showForm, setShowForm] = useState(false);

  if (!isAuthenticated) { router.push('/auth/login'); return null; }

  const { data: summary } = useQuery({ queryKey: ['op-summary'], queryFn: operatorApi.dashboard });
  const { data: routes = [] } = useQuery({ queryKey: ['op-routes'], queryFn: operatorApi.getRoutes });
  const { data: buses = [] } = useQuery({ queryKey: ['op-buses'], queryFn: operatorApi.getBuses });
  const { data: trips = [] } = useQuery({ queryKey: ['op-trips'], queryFn: () => operatorApi.getTrips() });

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'dispatch' as Tab, label: 'Dispatch', icon: Radio },
    { id: 'routes' as Tab, label: 'Routes', icon: MapPin },
    { id: 'buses' as Tab, label: 'Fleet', icon: Bus },
    { id: 'trips' as Tab, label: 'Trips', icon: Calendar },
    { id: 'schedules' as Tab, label: 'Schedules', icon: Repeat },
    { id: 'terminals' as Tab, label: 'Terminals', icon: Building2 },
  ];

  const s = summary as any;
  const r = routes as any[];
  const b = buses as any[];
  const t = trips as any[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Operator Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.firstName}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add New
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Buses', value: s?.totalBuses ?? b.length, color: 'text-blue-600' },
              { label: 'Active Buses', value: s?.activeBuses ?? b.filter((x: any) => x.isActive).length, color: 'text-green-600' },
              { label: 'Routes', value: s?.totalRoutes ?? r.length, color: 'text-orange-600' },
              { label: 'Trips Today', value: t.length, color: 'text-purple-600' },
            ].map((stat) => (
              <div key={stat.label} className="card text-center">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Quick Start</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { label: 'Add a Route', desc: 'Define origin → destination', tab: 'routes' as Tab },
                { label: 'Register a Bus', desc: 'Add bus to your fleet', tab: 'buses' as Tab },
                { label: 'Schedule a Trip', desc: 'Assign bus to a route', tab: 'trips' as Tab },
              ].map((q) => (
                <button key={q.label} onClick={() => { setTab(q.tab); setShowForm(true); }}
                  className="text-left border border-slate-100 hover:border-orange-200 rounded-xl p-4 transition-all">
                  <div className="font-medium text-sm">{q.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{q.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Routes tab */}
      {tab === 'routes' && (
        <div className="space-y-4">
          {showForm && <AddRouteForm onSuccess={() => setShowForm(false)} />}
          {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={14} /> Add Route</button>}
          {r.length === 0
            ? <div className="card text-center py-10 text-slate-400">No routes yet. Add your first route above.</div>
            : r.map((route: any) => (
              <div key={route.id} className="card flex justify-between items-center">
                <div>
                  <div className="font-semibold">{route.name}</div>
                  <div className="text-sm text-slate-500">{route.originCity} → {route.destinationCity} · {route.distanceKm} km · {Math.floor(route.estimatedMinutes / 60)}h {route.estimatedMinutes % 60}m</div>
                </div>
                <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">Active</span>
              </div>
            ))}
        </div>
      )}

      {/* Buses tab */}
      {tab === 'buses' && (
        <div className="space-y-4">
          {showForm && <AddBusForm onSuccess={() => setShowForm(false)} />}
          {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={14} /> Register Bus</button>}
          {b.length === 0
            ? <div className="card text-center py-10 text-slate-400">No buses registered yet.</div>
            : b.map((bus: any) => (
              <div key={bus.id} className="card flex justify-between items-center gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{bus.registrationNumber}</div>
                  <div className="text-sm text-slate-500">{bus.make} {bus.model} · {bus.totalSeats} seats · {bus.busType}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadPdf(`/documents/maintenance/${bus.id}`, `maintenance-${bus.registrationNumber}.pdf`).catch(() => alert('Could not generate report'))}
                    className="text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg">Maintenance</button>
                  <button onClick={() => downloadPdf(`/documents/inspection/${bus.id}`, `inspection-${bus.registrationNumber}.pdf`).catch(() => alert('Could not generate report'))}
                    className="text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg">Inspection</button>
                  <span className={`text-xs px-2 py-1 rounded-full ${bus.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {bus.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Trips tab */}
      {tab === 'trips' && (
        <div className="space-y-4">
          {showForm && <AddTripForm routes={r} buses={b} onSuccess={() => setShowForm(false)} />}
          {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={14} /> Schedule Trip</button>}
          {t.length === 0
            ? <div className="card text-center py-10 text-slate-400">No trips scheduled yet.</div>
            : t.map((trip: any) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
        </div>
      )}

      {/* Dispatch tab */}
      {tab === 'dispatch' && <DispatchBoard />}

      {/* Schedules tab */}
      {tab === 'schedules' && <SchedulesTab routes={r} buses={b} />}

      {/* Terminals tab */}
      {tab === 'terminals' && <TerminalsTab />}
    </div>
  );
}

// ── Recurring Schedules ─────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function SchedulesTab({ routes, buses }: { routes: any[]; buses: any[] }) {
  const qc = useQueryClient();
  const { data: schedules = [] } = useQuery({ queryKey: ['op-schedules'], queryFn: operatorApi.getSchedules });
  const [form, setForm] = useState<any>({ routeId: '', busId: '', departureTime: '08:00', basePrice: '', daysOfWeek: [1, 2, 3, 4, 5] });
  const [msg, setMsg] = useState('');

  const createMut = useMutation({
    mutationFn: () => operatorApi.createSchedule({
      routeId: form.routeId, busId: form.busId, departureTime: form.departureTime,
      basePrice: Number(form.basePrice), daysOfWeek: form.daysOfWeek,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['op-schedules'] }); setForm({ ...form, basePrice: '' }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => operatorApi.removeSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-schedules'] }),
  });
  const genMut = useMutation({
    mutationFn: () => operatorApi.generateSchedules(),
    onSuccess: (res: any) => { setMsg(`Generated ${res?.tripsCreated ?? 0} trip(s) for the next 7 days.`); qc.invalidateQueries({ queryKey: ['op-trips'] }); },
  });

  const toggleDay = (d: number) =>
    setForm((f: any) => ({ ...f, daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x: number) => x !== d) : [...f.daysOfWeek, d].sort() }));

  const list = schedules as any[];
  const canSubmit = form.routeId && form.busId && form.basePrice && form.daysOfWeek.length;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Repeat size={16} className="text-orange-600" /> New recurring schedule</h3>
          <button onClick={() => genMut.mutate()} disabled={genMut.isPending}
            className="text-xs flex items-center gap-1.5 border border-orange-200 text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg disabled:opacity-50">
            <RefreshCw size={13} className={genMut.isPending ? 'animate-spin' : ''} /> Generate trips now
          </button>
        </div>
        {msg && <div className="text-xs bg-green-50 text-green-700 rounded-lg px-3 py-2 mb-3">{msg}</div>}
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Route">
            <select className="input" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
              <option value="">Select route…</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Bus">
            <select className="input" value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
              <option value="">Select bus…</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.registrationNumber} · {b.totalSeats} seats</option>)}
            </select>
          </Field>
          <Field label="Departure time"><input type="time" className="input" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} /></Field>
          <Field label="Base price (Rs)"><input type="number" className="input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="1200" /></Field>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Runs on</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)} type="button"
                className={`text-xs px-3 py-1.5 rounded-lg border ${form.daysOfWeek.includes(i) ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-500'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => createMut.mutate()} disabled={!canSubmit || createMut.isPending}
          className="btn-primary mt-4 text-sm flex items-center gap-2 disabled:opacity-50">
          <Plus size={14} /> Add schedule
        </button>
      </div>

      {list.length === 0
        ? <div className="card text-center py-10 text-slate-400">No recurring schedules yet.</div>
        : list.map((sch) => {
          const route = routes.find((r) => r.id === sch.routeId);
          const bus = buses.find((b) => b.id === sch.busId);
          return (
            <div key={sch.id} className="card flex justify-between items-center">
              <div>
                <div className="font-semibold">{route?.name ?? 'Route'} · {sch.departureTime}</div>
                <div className="text-sm text-slate-500">
                  {bus?.registrationNumber ?? 'Bus'} · Rs {Number(sch.basePrice).toLocaleString()} ·{' '}
                  {(sch.daysOfWeek ?? []).map((d: number) => DAYS[d]).join(', ')}
                </div>
              </div>
              <button onClick={() => delMut.mutate(sch.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          );
        })}
    </div>
  );
}

// ── Terminals / boarding points ─────────────────────────────────────
function TerminalsTab() {
  const qc = useQueryClient();
  const { data: terminals = [] } = useQuery({ queryKey: ['op-terminals'], queryFn: () => operatorApi.getTerminals() });
  const [form, setForm] = useState<any>({ city: '', name: '', landmark: '', address: '' });

  const createMut = useMutation({
    mutationFn: () => operatorApi.createTerminal(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['op-terminals'] }); setForm({ city: '', name: '', landmark: '', address: '' }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => operatorApi.removeTerminal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-terminals'] }),
  });

  const list = terminals as any[];
  const canSubmit = form.city && form.name;

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Building2 size={16} className="text-orange-600" /> Add terminal / boarding point</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lahore" /></Field>
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kalma Chowk Terminal" /></Field>
          <Field label="Landmark"><input className="input" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Near Kalma Chowk flyover" /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ferozepur Road" /></Field>
        </div>
        <button onClick={() => createMut.mutate()} disabled={!canSubmit || createMut.isPending}
          className="btn-primary mt-4 text-sm flex items-center gap-2 disabled:opacity-50">
          <Plus size={14} /> Add terminal
        </button>
      </div>

      {list.length === 0
        ? <div className="card text-center py-10 text-slate-400">No terminals yet.</div>
        : list.map((tm) => (
          <div key={tm.id} className="card flex justify-between items-center">
            <div>
              <div className="font-semibold">{tm.name} <span className="text-xs text-slate-400 font-normal">· {tm.city}</span></div>
              <div className="text-sm text-slate-500">{[tm.landmark, tm.address].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            <button onClick={() => delMut.mutate(tm.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
    </div>
  );
}

function TripCard({ trip }: { trip: any }) {
  const qc = useQueryClient();
  const statusMut = useMutation({
    mutationFn: (status: string) => operatorApi.updateTripStatus(trip.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-trips'] }),
  });
  const [decision, setDecision] = useState<any>(null);
  const decideMut = useMutation({
    mutationFn: () => operatorApi.dispatchDecision(trip.id),
    onSuccess: (d: any) => setDecision(d),
  });

  const actions = STATUS_FLOW[trip.status] ?? [];
  const canDecide = ['DELAYED', 'DEPARTED', 'BOARDING', 'IN_TRANSIT'].includes(trip.status);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {trip.status}
            </span>
          </div>
          <div className="font-semibold text-gray-800">
            {new Date(trip.departureTime).toLocaleString('en-PK', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            Rs {Number(trip.basePrice).toLocaleString()} ·{' '}
            {Object.values(trip.seatAvailability || {}).filter((s) => s === 'AVAILABLE').length} seats free
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {trip.status === 'IN_TRANSIT' && (
            <Link
              href={`/track/${trip.id}`}
              className="flex items-center gap-1 text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
            >
              <Navigation size={12} /> Track
            </Link>
          )}
          {actions.map((action) => (
            <button
              key={action.next}
              onClick={() => statusMut.mutate(action.next)}
              disabled={statusMut.isPending}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-50 ${action.color}`}
            >
              {action.label}
            </button>
          ))}
          {canDecide && (
            <button onClick={() => decideMut.mutate()} disabled={decideMut.isPending}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-600 text-white disabled:opacity-50">
              {decideMut.isPending ? 'Deciding…' : 'Dispatch AI'}
            </button>
          )}
        </div>
      </div>

      {decision && (
        <div className="mt-3 border-t pt-3 text-sm bg-indigo-50/40 -mx-5 px-5 -mb-5 pb-4 rounded-b-xl">
          <div className="font-medium text-indigo-700 mb-1">Dispatch recommendation</div>
          <div className="text-gray-800">{decision.recommendation}</div>
          <div className="text-xs text-slate-500 mt-1">
            {decision.affectedPassengers} passenger(s) · {decision.affectedSeats} seat(s)
            {decision.suggestedAlternative && <> · alt bus {decision.suggestedAlternative.registration}</>}
          </div>
        </div>
      )}
    </div>
  );
}

function generateLayout(totalSeats: number) {
  const seatsPerRow = 4;
  const rows = Math.ceil(totalSeats / seatsPerRow);
  const layout: any[] = [];
  let n = 1;
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= seatsPerRow && n <= totalSeats; c++) {
      layout.push({ seatNumber: String(n).padStart(2, '0'), row: r, col: c, type: c === 1 || c === 4 ? 'window' : 'aisle' });
      n++;
    }
  }
  return { rows, seatsPerRow, layout };
}
