'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Building2, Ban, CheckCircle, Save } from 'lucide-react';

const PLANS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];

/**
 * Multi-tenant management: every operator company with its plan, usage limits,
 * bus usage and suspend state. Suspending also blocks the operator's login.
 */
export function CompaniesConsole() {
  const qc = useQueryClient();
  const { data: companies, isLoading } = useQuery({ queryKey: ['admin-companies'], queryFn: adminApi.getCompanies });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-companies'] });
  const saveMut = useMutation({ mutationFn: (c: any) => adminApi.updateCompany(c.companyId, c.data), onSuccess: () => { setEditing(null); invalidate(); } });
  const suspendMut = useMutation({ mutationFn: (id: string) => adminApi.suspendCompany(id), onSuccess: invalidate });
  const activateMut = useMutation({ mutationFn: (id: string) => adminApi.activateCompany(id), onSuccess: invalidate });

  const startEdit = (c: any) => {
    setEditing(c.companyId);
    setDraft({ name: c.name, plan: c.plan, maxBuses: c.limits.maxBuses, maxRoutes: c.limits.maxRoutes, primaryColor: c.branding?.primaryColor || '' });
  };

  if (isLoading) return <div className="py-10 text-center text-gray-400">Loading companies…</div>;

  return (
    <div className="space-y-4">
      {(companies ?? []).map((c: any) => {
        const over = c.usage.buses > c.limits.maxBuses;
        return (
          <div key={c.companyId} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: c.branding?.primaryColor || '#0F172A' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.operator?.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">{c.plan}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
              <span>Buses: <b className={over ? 'text-red-600' : ''}>{c.usage.buses}</b> / {c.limits.maxBuses}</span>
              <span>Route cap: {c.limits.maxRoutes}</span>
            </div>

            {editing === c.companyId ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="border rounded px-2 py-1.5 text-sm" />
                <select value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} className="border rounded px-2 py-1.5 text-sm">
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={draft.maxBuses} onChange={(e) => setDraft({ ...draft, maxBuses: Number(e.target.value) })} placeholder="Max buses" className="border rounded px-2 py-1.5 text-sm" />
                <input value={draft.maxRoutes} onChange={(e) => setDraft({ ...draft, maxRoutes: Number(e.target.value) })} placeholder="Max routes" className="border rounded px-2 py-1.5 text-sm" />
                <input value={draft.primaryColor} onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })} placeholder="#hex color" className="border rounded px-2 py-1.5 text-sm" />
                <div className="col-span-2 md:col-span-5 flex gap-2">
                  <button onClick={() => saveMut.mutate({ companyId: c.companyId, data: draft })} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded flex items-center gap-1"><Save size={13} /> Save</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-gray-500 px-2">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(c)} className="text-xs bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">Edit plan / limits</button>
                {c.status === 'SUSPENDED' ? (
                  <button onClick={() => activateMut.mutate(c.companyId)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded flex items-center gap-1"><CheckCircle size={13} /> Reactivate</button>
                ) : (
                  <button onClick={() => { if (confirm(`Suspend ${c.name}? This blocks their login.`)) suspendMut.mutate(c.companyId); }} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded flex items-center gap-1"><Ban size={13} /> Suspend</button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {(companies ?? []).length === 0 && <div className="py-10 text-center text-gray-400">No operator companies yet.</div>}
    </div>
  );
}
