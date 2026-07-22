'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { MapPin, Image as ImageIcon, SlidersHorizontal, Plus, Trash2, Save } from 'lucide-react';

/** CMS / catalog: cities, marketing banners, and the fare-rule governor. */
export function CatalogConsole() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'cities' | 'banners' | 'fare'>('cities');

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {([['cities', 'Cities'], ['banners', 'Banners'], ['fare', 'Fare rules']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
        ))}
      </div>
      {tab === 'cities' && <Cities qc={qc} />}
      {tab === 'banners' && <Banners qc={qc} />}
      {tab === 'fare' && <FareRules />}
    </div>
  );
}

function Cities({ qc }: { qc: any }) {
  const { data: cities } = useQuery({ queryKey: ['admin-cities'], queryFn: adminApi.getCities });
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-cities'] });
  const add = useMutation({ mutationFn: () => adminApi.addCity({ name, province }), onSuccess: () => { setName(''); setProvince(''); inv(); } });
  const toggle = useMutation({ mutationFn: (c: any) => adminApi.updateCity(c.id, { isActive: !c.isActive }), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: string) => adminApi.deleteCity(id), onSuccess: inv });

  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-2 flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="City name" className="border rounded px-3 py-2 text-sm flex-1 min-w-[140px]" />
        <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Province" className="border rounded px-3 py-2 text-sm" />
        <button onClick={() => name && add.mutate()} className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1"><Plus size={14} /> Add city</button>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><MapPin size={16} /> Cities</div>
        <table className="w-full text-sm">
          <tbody>
            {(cities ?? []).map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2 text-gray-400">{c.province || '—'}</td>
                <td className="px-4 py-2">
                  <button onClick={() => toggle.mutate(c)} className={`text-xs px-2 py-0.5 rounded ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{c.isActive ? 'Active' : 'Hidden'}</button>
                </td>
                <td className="px-4 py-2 text-right"><button onClick={() => del.mutate(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {(cities ?? []).length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={4}>No cities yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Banners({ qc }: { qc: any }) {
  const { data: banners } = useQuery({ queryKey: ['admin-banners'], queryFn: adminApi.getBanners });
  const [f, setF] = useState({ title: '', imageUrl: '', linkUrl: '', placement: 'HOME' });
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-banners'] });
  const add = useMutation({ mutationFn: () => adminApi.addBanner(f), onSuccess: () => { setF({ title: '', imageUrl: '', linkUrl: '', placement: 'HOME' }); inv(); } });
  const del = useMutation({ mutationFn: (id: string) => adminApi.deleteBanner(id), onSuccess: inv });

  return (
    <div className="space-y-4">
      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" className="border rounded px-3 py-2 text-sm" />
        <input value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} placeholder="Image URL" className="border rounded px-3 py-2 text-sm" />
        <input value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value })} placeholder="Link URL" className="border rounded px-3 py-2 text-sm" />
        <select value={f.placement} onChange={(e) => setF({ ...f, placement: e.target.value })} className="border rounded px-3 py-2 text-sm">
          <option value="HOME">Home</option><option value="SEARCH">Search</option>
        </select>
        <button onClick={() => f.title && add.mutate()} className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 col-span-2 md:col-span-1"><Plus size={14} /> Add banner</button>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><ImageIcon size={16} /> Banners</div>
        <table className="w-full text-sm">
          <tbody>
            {(banners ?? []).map((b: any) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2 font-medium">{b.title}</td>
                <td className="px-4 py-2 text-gray-400">{b.placement}</td>
                <td className="px-4 py-2 text-right"><button onClick={() => del.mutate(b.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {(banners ?? []).length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={3}>No banners yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FareRules() {
  const { data } = useQuery({ queryKey: ['admin-fare-rules'], queryFn: adminApi.getFareRules });
  const [r, setR] = useState({ minFare: 0, maxFare: 0, maxSurge: 1.6 });
  useEffect(() => { if (data) setR({ minFare: data.minFare, maxFare: data.maxFare, maxSurge: data.maxSurge }); }, [data]);
  const save = useMutation({ mutationFn: () => adminApi.setFareRules(r) });

  return (
    <div className="card p-5 max-w-lg">
      <div className="flex items-center gap-2 font-semibold text-gray-800 mb-1"><SlidersHorizontal size={16} /> Fare governor</div>
      <p className="text-xs text-gray-500 mb-4">Caps how far dynamic pricing and operator fares may move.</p>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">Min fare (Rs)<input type="number" value={r.minFare} onChange={(e) => setR({ ...r, minFare: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
        <label className="text-sm">Max fare (Rs)<input type="number" value={r.maxFare} onChange={(e) => setR({ ...r, maxFare: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
        <label className="text-sm">Max surge ×<input type="number" step="0.1" value={r.maxSurge} onChange={(e) => setR({ ...r, maxSurge: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-1.5" /></label>
      </div>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1"><Save size={14} /> {save.isSuccess ? 'Saved' : 'Save rules'}</button>
    </div>
  );
}
