'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { ShieldCheck, AlertTriangle, Clock, Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const OWNER_TYPES = ['BUS', 'DRIVER', 'COMPANY', 'EMPLOYEE'];
const DOC_TYPES = ['ROUTE_PERMIT', 'FITNESS_CERT', 'INSURANCE', 'LICENCE', 'CNIC', 'REGISTRATION', 'NTN', 'MEDICAL'];

const badge = (expiry: string) =>
  expiry === 'EXPIRED' ? 'bg-red-100 text-red-700'
  : expiry === 'EXPIRING' ? 'bg-amber-100 text-amber-700'
  : expiry === 'OK' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';

/** Compliance / KYC: expiry alerts for permits, fitness, licences + document management. */
export function ComplianceConsole() {
  const qc = useQueryClient();
  const { data: alerts } = useQuery({ queryKey: ['compliance-expiring'], queryFn: () => adminApi.getComplianceExpiring(30) });
  const { data: docs } = useQuery({ queryKey: ['compliance-docs'], queryFn: adminApi.getComplianceDocs });
  const [f, setF] = useState({ ownerType: 'BUS', ownerLabel: '', ownerId: '', docType: 'ROUTE_PERMIT', number: '', expiresAt: '' });

  const inv = () => { qc.invalidateQueries({ queryKey: ['compliance-expiring'] }); qc.invalidateQueries({ queryKey: ['compliance-docs'] }); };
  const add = useMutation({ mutationFn: () => adminApi.addComplianceDoc({ ...f, ownerId: f.ownerId || f.ownerLabel || 'n/a' }), onSuccess: () => { setF({ ...f, ownerLabel: '', ownerId: '', number: '', expiresAt: '' }); inv(); } });
  const verify = useMutation({ mutationFn: (p: { id: string; status: string }) => adminApi.verifyComplianceDoc(p.id, p.status), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: string) => adminApi.deleteComplianceDoc(id), onSuccess: inv });

  const expired = alerts?.expired ?? [];
  const soon = alerts?.expiringSoon ?? [];

  return (
    <div className="space-y-6">
      {/* Alert queue */}
      <div className="grid md:grid-cols-2 gap-4">
        <AlertCard title="Expired" icon={AlertTriangle} tone="red" items={expired} onVerify={verify} onDel={del} />
        <AlertCard title="Expiring ≤ 30 days" icon={Clock} tone="amber" items={soon} onVerify={verify} onDel={del} />
      </div>

      {/* Add document */}
      <div className="card p-4">
        <div className="flex items-center gap-2 font-semibold text-gray-800 mb-3"><Plus size={16} /> Add document</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <select value={f.ownerType} onChange={(e) => setF({ ...f, ownerType: e.target.value })} className="border rounded px-2 py-2 text-sm">{OWNER_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
          <input value={f.ownerLabel} onChange={(e) => setF({ ...f, ownerLabel: e.target.value })} placeholder="Owner (bus reg / name)" className="border rounded px-2 py-2 text-sm col-span-2" />
          <select value={f.docType} onChange={(e) => setF({ ...f, docType: e.target.value })} className="border rounded px-2 py-2 text-sm">{DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select>
          <input value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="Doc number" className="border rounded px-2 py-2 text-sm" />
          <input type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} className="border rounded px-2 py-2 text-sm" />
        </div>
        <button onClick={() => f.ownerLabel && add.mutate()} className="mt-3 bg-orange-600 text-white text-sm px-4 py-2 rounded">Add document</button>
      </div>

      {/* All documents */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><ShieldCheck size={16} /> All documents</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left"><tr>
            <th className="px-4 py-2">Owner</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Expires</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {(docs ?? []).map((d: any) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-2 font-medium">{d.ownerLabel || d.ownerId}<div className="text-xs text-gray-400">{d.ownerType}</div></td>
                <td className="px-4 py-2">{d.docType}</td>
                <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded ${badge(d.expiry)}`}>{d.expiresAt || '—'}{d.daysLeft != null ? ` (${d.daysLeft}d)` : ''}</span></td>
                <td className="px-4 py-2 text-xs">{d.status}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {d.status !== 'VERIFIED' && <button onClick={() => verify.mutate({ id: d.id, status: 'VERIFIED' })} className="text-green-600 hover:text-green-700 mr-2" title="Verify"><CheckCircle size={15} /></button>}
                  {d.status !== 'REJECTED' && <button onClick={() => verify.mutate({ id: d.id, status: 'REJECTED' })} className="text-amber-500 hover:text-amber-600 mr-2" title="Reject"><XCircle size={15} /></button>}
                  <button onClick={() => del.mutate(d.id)} className="text-red-400 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {(docs ?? []).length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={5}>No documents yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertCard({ title, icon: Icon, tone, items, onVerify, onDel }: any) {
  const toneCls = tone === 'red' ? 'text-red-600' : 'text-amber-600';
  return (
    <div className="card p-4">
      <div className={`flex items-center gap-2 font-semibold mb-3 ${toneCls}`}><Icon size={16} /> {title} <span className="text-gray-400 font-normal">({items.length})</span></div>
      {items.length === 0 ? <div className="text-sm text-gray-400 py-2">Nothing here — all good.</div> : items.map((d: any) => (
        <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
          <div><span className="font-medium">{d.ownerLabel || d.ownerId}</span> <span className="text-gray-400">· {d.docType}</span></div>
          <div className="text-xs text-gray-500">{d.expiresAt} ({d.daysLeft}d)</div>
        </div>
      ))}
    </div>
  );
}
