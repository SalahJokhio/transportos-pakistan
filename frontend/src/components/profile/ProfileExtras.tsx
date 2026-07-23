'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/lib/api/endpoints';
import { Users, MapPin, Bell, Plus, Trash2, Star } from 'lucide-react';

export function ProfileExtras() {
  return (
    <div className="space-y-6">
      <SavedTravelers />
      <SavedAddresses />
      <NotificationPrefs />
    </div>
  );
}

function SavedTravelers() {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({ queryKey: ['travelers'], queryFn: profileApi.travelers });
  const [f, setF] = useState<any>({ name: '', relationship: 'Family', gender: 'M', seatPreference: 'Window', cnic: '' });
  const [show, setShow] = useState(false);
  const add = useMutation({ mutationFn: () => profileApi.addTraveler(f), onSuccess: () => { setF({ name: '', relationship: 'Family', gender: 'M', seatPreference: 'Window', cnic: '' }); setShow(false); qc.invalidateQueries({ queryKey: ['travelers'] }); } });
  const del = useMutation({ mutationFn: (id: string) => profileApi.removeTraveler(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['travelers'] }) });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Users size={17} className="text-orange-600" /> Saved Travellers</h2>
        <button onClick={() => setShow((s) => !s)} className="text-xs text-orange-600 flex items-center gap-1"><Plus size={13} /> Add</button>
      </div>
      {show && (
        <div className="border rounded-lg p-3 mb-3 space-y-2 bg-slate-50">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" className="w-full border rounded px-2 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} className="border rounded px-2 py-1.5 text-sm">{['Self', 'Family', 'Friend', 'Child', 'Parent'].map((r) => <option key={r}>{r}</option>)}</select>
            <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className="border rounded px-2 py-1.5 text-sm"><option value="M">Male</option><option value="F">Female</option></select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={f.cnic} onChange={(e) => setF({ ...f, cnic: e.target.value })} placeholder="CNIC (optional)" className="border rounded px-2 py-1.5 text-sm" />
            <select value={f.seatPreference} onChange={(e) => setF({ ...f, seatPreference: e.target.value })} className="border rounded px-2 py-1.5 text-sm"><option>Window</option><option>Aisle</option></select>
          </div>
          <button onClick={() => f.name && add.mutate()} disabled={!f.name || add.isPending} className="bg-orange-600 text-white text-sm rounded px-3 py-1.5 disabled:opacity-40">Save traveller</button>
        </div>
      )}
      {list.length === 0 ? <div className="text-sm text-slate-400 py-2">No saved travellers yet.</div> : (
        <div className="divide-y">
          {list.map((t: any) => (
            <div key={t.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">{t.name} <span className="text-xs text-slate-400 font-normal">· {t.relationship}</span></div>
                <div className="text-xs text-slate-500">{t.gender === 'F' ? 'Female' : 'Male'} · {t.seatPreference} seat{t.cnic ? ` · ${t.cnic}` : ''}</div>
              </div>
              <button onClick={() => del.mutate(t.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SavedAddresses() {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({ queryKey: ['addresses'], queryFn: profileApi.addresses });
  const [f, setF] = useState<any>({ label: 'Home', line: '', area: '', city: '', isDefault: false });
  const [show, setShow] = useState(false);
  const add = useMutation({ mutationFn: () => profileApi.addAddress(f), onSuccess: () => { setF({ label: 'Home', line: '', area: '', city: '', isDefault: false }); setShow(false); qc.invalidateQueries({ queryKey: ['addresses'] }); } });
  const del = useMutation({ mutationFn: (id: string) => profileApi.removeAddress(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }) });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><MapPin size={17} className="text-orange-600" /> Saved Addresses</h2>
        <button onClick={() => setShow((s) => !s)} className="text-xs text-orange-600 flex items-center gap-1"><Plus size={13} /> Add</button>
      </div>
      {show && (
        <div className="border rounded-lg p-3 mb-3 space-y-2 bg-slate-50">
          <div className="grid grid-cols-2 gap-2">
            <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Label (Home/Office)" className="border rounded px-2 py-1.5 text-sm" />
            <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <input value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} placeholder="Street / house" className="w-full border rounded px-2 py-1.5 text-sm" />
          <input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Area" className="w-full border rounded px-2 py-1.5 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} /> Set as default</label>
          <button onClick={() => f.label && add.mutate()} disabled={!f.label || add.isPending} className="bg-orange-600 text-white text-sm rounded px-3 py-1.5 disabled:opacity-40">Save address</button>
        </div>
      )}
      {list.length === 0 ? <div className="text-sm text-slate-400 py-2">No saved addresses yet.</div> : (
        <div className="divide-y">
          {list.map((a: any) => (
            <div key={a.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800 flex items-center gap-1">{a.label} {a.isDefault && <Star size={12} className="text-amber-400" fill="currentColor" />}</div>
                <div className="text-xs text-slate-500">{[a.line, a.area, a.city].filter(Boolean).join(', ') || '—'}</div>
              </div>
              <button onClick={() => del.mutate(a.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { key: 'booking', label: 'Booking' }, { key: 'trips', label: 'Trips' }, { key: 'payments', label: 'Payments' },
  { key: 'marketing', label: 'Marketing' }, { key: 'security', label: 'Security' },
];
const CHANNELS = ['push', 'sms', 'email', 'whatsapp'];

function NotificationPrefs() {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({ queryKey: ['notif-prefs'], queryFn: profileApi.getPrefs });
  const save = useMutation({ mutationFn: (p: any) => profileApi.setPrefs(p), onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-prefs'] }) });

  if (!prefs) return null;
  const toggle = (cat: string, ch: string) => {
    const next = JSON.parse(JSON.stringify(prefs));
    next[cat] = { ...next[cat], [ch]: !next[cat]?.[ch] };
    save.mutate(next);
  };

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3"><Bell size={17} className="text-orange-600" /> Notification Preferences</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[380px]">
          <thead>
            <tr className="text-xs text-slate-400 text-left"><th className="py-1">Category</th>{CHANNELS.map((c) => <th key={c} className="text-center capitalize">{c}</th>)}</tr>
          </thead>
          <tbody>
            {CATEGORIES.map(({ key, label }) => (
              <tr key={key} className="border-t">
                <td className="py-2 text-slate-700">{label}</td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-center">
                    <input type="checkbox" checked={!!(prefs as any)[key]?.[ch]} onChange={() => toggle(key, ch)} className="accent-orange-600" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">Changes save automatically.</p>
    </div>
  );
}
