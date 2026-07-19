'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { ScrollText, ShieldCheck, Save, Check } from 'lucide-react';

/** Audit trail of admin actions + an editable role→capability permission matrix. */
export function AccessConsole() {
  const [tab, setTab] = useState<'audit' | 'rbac'>('audit');
  return (
    <div>
      <div className="flex gap-2 mb-5">
        {([['audit', 'Audit log'], ['rbac', 'Permissions (RBAC)']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
        ))}
      </div>
      {tab === 'audit' ? <AuditLog /> : <Rbac />}
    </div>
  );
}

function AuditLog() {
  const { data: logs } = useQuery({ queryKey: ['admin-audit'], queryFn: () => adminApi.getAuditLogs(100) });
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><ScrollText size={16} /> Recent admin actions</div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-left"><tr>
          <th className="px-4 py-2">When</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Target</th>
        </tr></thead>
        <tbody>
          {(logs ?? []).map((l: any) => (
            <tr key={l.id} className="border-t">
              <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2">{l.actorRole || '—'}</td>
              <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
              <td className="px-4 py-2 text-gray-400 text-xs">{l.targetId || '—'}</td>
            </tr>
          ))}
          {(logs ?? []).length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={4}>No actions logged yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Rbac() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-rbac'], queryFn: adminApi.getRbac });
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  useEffect(() => { if (data?.matrix) setMatrix(data.matrix); }, [data]);
  const save = useMutation({ mutationFn: () => adminApi.setRbac(matrix), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-rbac'] }) });

  const caps: string[] = data?.capabilities ?? [];
  const roles = Object.keys(matrix);

  const toggle = (role: string, cap: string) => {
    setMatrix((m) => {
      const has = (m[role] ?? []).includes(cap);
      return { ...m, [role]: has ? m[role].filter((c) => c !== cap) : [...(m[role] ?? []), cap] };
    });
  };

  return (
    <div className="card p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-gray-800"><ShieldCheck size={16} /> Permission matrix</div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1">
          {save.isSuccess ? <Check size={14} /> : <Save size={14} />} Save
        </button>
      </div>
      <table className="text-sm">
        <thead><tr>
          <th className="px-3 py-2 text-left text-gray-500">Capability</th>
          {roles.map((r) => <th key={r} className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{r.replace('_', ' ')}</th>)}
        </tr></thead>
        <tbody>
          {caps.map((cap) => (
            <tr key={cap} className="border-t">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{cap.replace(/_/g, ' ')}</td>
              {roles.map((role) => (
                <td key={role} className="px-3 py-2 text-center">
                  <input type="checkbox" checked={(matrix[role] ?? []).includes(cap)} onChange={() => toggle(role, cap)} className="w-4 h-4 accent-orange-600" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-3">Controls which back-office capabilities each role has. Applied to console feature-gating; backend enforcement rolls out per endpoint.</p>
    </div>
  );
}
