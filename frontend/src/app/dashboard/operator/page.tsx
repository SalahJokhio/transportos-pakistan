'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operatorApi } from '@/lib/api/operator';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bus, MapPin, Calendar, BarChart3, Plus, CheckCircle, AlertCircle, Navigation,
} from 'lucide-react';

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

type Tab = 'overview' | 'routes' | 'buses' | 'trips';

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
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => operatorApi.createRoute({
      ...form,
      distanceKm: Number(form.distanceKm),
      estimatedMinutes: Number(form.estimatedMinutes),
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
    { id: 'routes' as Tab, label: 'Routes', icon: MapPin },
    { id: 'buses' as Tab, label: 'Fleet', icon: Bus },
    { id: 'trips' as Tab, label: 'Trips', icon: Calendar },
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
              <div key={bus.id} className="card flex justify-between items-center">
                <div>
                  <div className="font-semibold">{bus.registrationNumber}</div>
                  <div className="text-sm text-slate-500">{bus.make} {bus.model} · {bus.totalSeats} seats · {bus.busType}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${bus.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  {bus.isActive ? 'Active' : 'Inactive'}
                </span>
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
    </div>
  );
}

function TripCard({ trip }: { trip: any }) {
  const qc = useQueryClient();
  const statusMut = useMutation({
    mutationFn: (status: string) => operatorApi.updateTripStatus(trip.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-trips'] }),
  });

  const actions = STATUS_FLOW[trip.status] ?? [];

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
        </div>
      </div>
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
