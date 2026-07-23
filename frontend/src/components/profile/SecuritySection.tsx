'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '@/lib/api/endpoints';
import { ShieldCheck, KeyRound, Clock, CheckCircle, Copy } from 'lucide-react';

export function SecuritySection() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ['security-status'], queryFn: securityApi.status });
  const { data: history = [] } = useQuery({ queryKey: ['login-history'], queryFn: securityApi.loginHistory });
  const [setup, setSetup] = useState<any>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const begin = useMutation({ mutationFn: () => securityApi.setup2fa(), onSuccess: (r: any) => setSetup(r) });
  const enable = useMutation({
    mutationFn: () => securityApi.enable2fa(code),
    onSuccess: () => { setSetup(null); setCode(''); setErr(''); qc.invalidateQueries({ queryKey: ['security-status'] }); },
    onError: () => setErr('Invalid code — try the current one from your app.'),
  });
  const disable = useMutation({
    mutationFn: () => securityApi.disable2fa(code),
    onSuccess: () => { setCode(''); setErr(''); qc.invalidateQueries({ queryKey: ['security-status'] }); },
    onError: () => setErr('Invalid code.'),
  });

  const enabled = !!(status as any)?.twoFactorEnabled;

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3"><ShieldCheck size={17} className="text-orange-600" /> Security Center</h2>

      {/* 2FA */}
      <div className="border rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><KeyRound size={14} /> Two-Factor Authentication</div>
            <div className="text-xs text-slate-500">{enabled ? 'Enabled — a code is required at login.' : 'Add an extra layer of security with an authenticator app.'}</div>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${enabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{enabled ? 'ON' : 'OFF'}</span>
        </div>

        {!enabled && !setup && (
          <button onClick={() => begin.mutate()} disabled={begin.isPending} className="mt-3 bg-orange-600 text-white text-sm rounded-lg px-3 py-1.5 disabled:opacity-40">
            {begin.isPending ? '…' : 'Enable 2FA'}
          </button>
        )}

        {!enabled && setup && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-600">1. In your authenticator app (Google Authenticator, Authy…), add an account with this key:</div>
            <div className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5">
              <code className="text-sm font-mono flex-1 break-all">{setup.secret}</code>
              <button onClick={() => navigator.clipboard.writeText(setup.secret)} className="text-slate-400 hover:text-slate-700"><Copy size={14} /></button>
            </div>
            <div className="text-xs text-slate-600">2. Enter the 6-digit code it shows:</div>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="border rounded-lg px-3 py-1.5 text-sm w-28 tracking-widest text-center" />
              <button onClick={() => code.length === 6 && enable.mutate()} disabled={code.length !== 6 || enable.isPending} className="bg-green-600 text-white text-sm rounded-lg px-3 disabled:opacity-40">Verify & enable</button>
            </div>
            {err && <div className="text-xs text-red-500">{err}</div>}
          </div>
        )}

        {enabled && (
          <div className="mt-3 flex gap-2 items-center">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code to disable" className="border rounded-lg px-3 py-1.5 text-sm w-40 tracking-widest text-center" />
            <button onClick={() => code.length === 6 && disable.mutate()} disabled={code.length !== 6 || disable.isPending} className="border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg px-3 py-1.5 disabled:opacity-40">Disable 2FA</button>
            {err && <span className="text-xs text-red-500">{err}</span>}
          </div>
        )}
      </div>

      {/* Login history */}
      <div>
        <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mb-2"><Clock size={14} /> Recent logins</div>
        {(history as any[]).length === 0 ? <div className="text-xs text-slate-400">No login history yet.</div> : (
          <div className="divide-y max-h-56 overflow-y-auto">
            {(history as any[]).map((h) => (
              <div key={h.id} className="py-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate pr-2">{h.device || 'Unknown device'}{h.ip ? ` · ${h.ip}` : ''}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={h.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}>{h.status}</span>
                  <span className="text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
