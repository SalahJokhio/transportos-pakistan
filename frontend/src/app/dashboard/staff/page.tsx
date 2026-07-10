'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operatorApi } from '@/lib/api/operator';
import { OperatorNav } from '@/components/operator/OperatorNav';
import {
  Contact, Users, UserCheck, UserMinus, Wallet, Search, Plus, X,
  Phone, MapPin, CreditCard, Star, AlertCircle,
} from 'lucide-react';

const rs = (n: number) => `Rs ${Math.round(n || 0).toLocaleString()}`;

const TYPES = [
  'DRIVER', 'CONDUCTOR', 'MECHANIC', 'TECHNICIAN', 'BOOKING_AGENT',
  'TERMINAL_MANAGER', 'CLEANER', 'SECURITY', 'ACCOUNTANT', 'DISPATCHER',
];

const TYPE_BADGE: Record<string, string> = {
  DRIVER: 'bg-blue-100 text-blue-700',
  CONDUCTOR: 'bg-emerald-100 text-emerald-700',
  MECHANIC: 'bg-amber-100 text-amber-700',
  TECHNICIAN: 'bg-violet-100 text-violet-700',
  BOOKING_AGENT: 'bg-pink-100 text-pink-700',
  TERMINAL_MANAGER: 'bg-teal-100 text-teal-700',
  CLEANER: 'bg-slate-100 text-slate-600',
  SECURITY: 'bg-red-100 text-red-700',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-700',
  DISPATCHER: 'bg-indigo-100 text-indigo-700',
};

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  ON_DUTY: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'On duty' },
  ON_LEAVE: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'On leave' },
  SUSPENDED: { dot: 'bg-red-500', text: 'text-red-600', label: 'Suspended' },
  INACTIVE: { dot: 'bg-slate-400', text: 'text-slate-400', label: 'Inactive' },
};

const nice = (t: string) => t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const initials = (e: any) => `${(e.firstName?.[0] ?? '')}${(e.lastName?.[0] ?? '')}`.toUpperCase() || 'E';

export default function StaffPage() {
  const qc = useQueryClient();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const { data: stats } = useQuery({ queryKey: ['emp-stats'], queryFn: () => operatorApi.employeeStats() });
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['employees', type, search],
    queryFn: () => operatorApi.employees({ type: type || undefined, search: search || undefined }),
  });

  const list: any[] = Array.isArray(employees) ? employees : [];

  if (error) {
    return (
      <>
        <OperatorNav />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-red-500">
          Could not load staff. Log in as an operator.
        </div>
      </>
    );
  }

  return (
    <>
      <OperatorNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Contact size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Staff &amp; HR</h1>
              <p className="text-slate-500 text-sm">Every employee of the company — drivers, mechanics, agents &amp; more.</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add employee
          </button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard icon={<Users size={16} />} label="Total staff" value={String(stats?.total ?? 0)} tint="bg-emerald-50 text-emerald-700" />
          <MetricCard icon={<UserCheck size={16} />} label="On duty" value={String(stats?.onDuty ?? 0)} tint="bg-green-50 text-green-700" />
          <MetricCard icon={<UserMinus size={16} />} label="On leave" value={String(stats?.onLeave ?? 0)} tint="bg-amber-50 text-amber-700" />
          <MetricCard icon={<Wallet size={16} />} label="Payroll / mo" value={rs(stats?.monthlyPayroll ?? 0)} tint="bg-teal-50 text-teal-700" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, CNIC, phone…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
          >
            <option value="">All roles</option>
            {TYPES.map((t) => <option key={t} value={t}>{nice(t)}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Depot</th>
                <th className="text-left px-4 py-3">Salary</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : list.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14 text-slate-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No employees yet — add your first one.
                </td></tr>
              ) : (
                list.map((e) => {
                  const st = STATUS_STYLE[e.status] ?? STATUS_STYLE.INACTIVE;
                  return (
                    <tr key={e.id} onClick={() => setSelected(e)} className="hover:bg-emerald-50/40 cursor-pointer transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {initials(e)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()}</div>
                            {e.cnic && <div className="text-xs text-slate-400 font-mono">{e.cnic}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[e.employeeType] ?? 'bg-slate-100 text-slate-600'}`}>
                          {nice(e.employeeType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{e.depot || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{Number(e.salary) ? rs(Number(e.salary)) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">Click any employee to view their full record.</p>
      </div>

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['emp-stats'] }); setShowAdd(false); }} />}
      {selected && <EmployeeDetailModal employee={selected} onClose={() => setSelected(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['emp-stats'] }); setSelected(null); }} />}
    </>
  );
}

function MetricCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tint}`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function AddEmployeeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ employeeType: 'DRIVER', firstName: '', lastName: '', cnic: '', phone: '', depot: '', salary: '', status: 'ON_DUTY' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => operatorApi.createEmployee({ ...form, salary: form.salary ? Number(form.salary) : 0 }),
    onSuccess: onSaved,
  });

  return (
    <Overlay onClose={onClose} title="Add employee">
      <div className="space-y-3">
        <Field label="Role">
          <select value={form.employeeType} onChange={(e) => set('employeeType', e.target.value)} className="modal-input">
            {TYPES.map((t) => <option key={t} value={t}>{nice(t)}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input className="modal-input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Last name"><input className="modal-input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
        </div>
        <Field label="CNIC"><input className="modal-input" placeholder="42101-1234567-1" value={form.cnic} onChange={(e) => set('cnic', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className="modal-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Depot / terminal"><input className="modal-input" value={form.depot} onChange={(e) => set('depot', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly salary (Rs)"><input type="number" className="modal-input" value={form.salary} onChange={(e) => set('salary', e.target.value)} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="modal-input">
              {Object.keys(STATUS_STYLE).map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
            </select>
          </Field>
        </div>
        {mut.isError && <p className="text-sm text-red-500">Could not save. Try again.</p>}
        <button
          onClick={() => form.firstName.trim() && mut.mutate()}
          disabled={!form.firstName.trim() || mut.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {mut.isPending ? 'Saving…' : 'Save employee'}
        </button>
      </div>
    </Overlay>
  );
}

function EmployeeDetailModal({ employee, onClose, onSaved }: { employee: any; onClose: () => void; onSaved: () => void }) {
  const e = employee;
  const st = STATUS_STYLE[e.status] ?? STATUS_STYLE.INACTIVE;
  const setStatusMut = useMutation({
    mutationFn: (status: string) => operatorApi.updateEmployee(e.id, { status }),
    onSuccess: onSaved,
  });

  return (
    <Overlay onClose={onClose} title="Employee record">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-semibold">
          {initials(e)}
        </div>
        <div>
          <div className="font-bold text-lg text-slate-800">{`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()}</div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[e.employeeType] ?? 'bg-slate-100 text-slate-600'}`}>
            {nice(e.employeeType)}
          </span>
        </div>
      </div>

      <div className="space-y-2.5 text-sm border-t border-slate-100 pt-3">
        <Row icon={<CreditCard size={15} />} label="CNIC" value={e.cnic || '—'} mono />
        <Row icon={<Phone size={15} />} label="Phone" value={e.phone || '—'} />
        <Row icon={<MapPin size={15} />} label="Depot" value={e.depot || '—'} />
        <Row icon={<Wallet size={15} />} label="Salary" value={Number(e.salary) ? rs(Number(e.salary)) : '—'} />
        <Row icon={<Star size={15} />} label="Rating" value={e.rating ? `${e.rating.toFixed(1)} / 5` : 'No ratings yet'} />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-500"><span className={`w-2 h-2 rounded-full ${st.dot}`} /> Status</span>
          <span className={`font-medium ${st.text}`}>{st.label}</span>
        </div>
      </div>

      {/* Quick status actions */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {['ON_DUTY', 'ON_LEAVE', 'SUSPENDED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusMut.mutate(s)}
            disabled={setStatusMut.isPending || e.status === s}
            className={`text-xs font-medium py-2 rounded-lg border transition-colors disabled:opacity-40 ${
              e.status === s ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {STATUS_STYLE[s].label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3">Documents, attendance &amp; payroll history coming in the next module.</p>
    </Overlay>
  );
}

function Overlay({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        {children}
      </div>
      <style jsx global>{`
        .modal-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .modal-input:focus { border-color: #34d399; box-shadow: 0 0 0 2px #a7f3d0; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-500">{icon} {label}</span>
      <span className={`text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
