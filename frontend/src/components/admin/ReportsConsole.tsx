'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generativeApi } from '@/lib/api/admin';
import { FileText, Sparkles, Mail, Copy, Check } from 'lucide-react';

const EMAIL_KINDS = [
  { kind: 'delay', label: 'Delay apology' },
  { kind: 'refund', label: 'Refund confirmation' },
  { kind: 'thanks', label: 'Thank-you' },
];

/** Generative AI: drafted narrative documents grounded in real data. */
export function ReportsConsole() {
  const [output, setOutput] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [notes, setNotes] = useState('');
  const exec = useMutation({ mutationFn: () => generativeApi.executiveReport(), onSuccess: (r: any) => setOutput(r) });
  const email = useMutation({ mutationFn: (kind: string) => generativeApi.email(kind, { name: 'Customer', pnr: 'TOS-XXXX', delayMinutes: 25, amount: 1500 }), onSuccess: (r: any) => setOutput(r) });
  const shift = useMutation({ mutationFn: () => generativeApi.shiftPlan(), onSuccess: (r: any) => setOutput(r) });
  const maint = useMutation({ mutationFn: () => generativeApi.maintenanceSummary(), onSuccess: (r: any) => setOutput(r) });
  const meeting = useMutation({ mutationFn: () => generativeApi.meetingSummary(notes), onSuccess: (r: any) => setOutput(r) });

  const copy = () => { if (output?.text) { navigator.clipboard.writeText(output.text); setCopied(true); setTimeout(() => setCopied(false), 1500); } };
  const busy = exec.isPending || email.isPending || shift.isPending || maint.isPending || meeting.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <Sparkles size={20} className="text-indigo-600" />
        <div>
          <div className="font-semibold">Generative Reports</div>
          <div className="text-xs text-gray-500">AI-drafted documents grounded in your live data (Claude when configured, else a solid template).</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exec.mutate()} disabled={busy}
            className="text-sm bg-indigo-600 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
            <FileText size={15} /> Executive report
          </button>
          <button onClick={() => shift.mutate()} disabled={busy}
            className="text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
            <FileText size={15} /> Shift plan
          </button>
          <button onClick={() => maint.mutate()} disabled={busy}
            className="text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
            <FileText size={15} /> Maintenance summary
          </button>
          {EMAIL_KINDS.map((e) => (
            <button key={e.kind} onClick={() => email.mutate(e.kind)} disabled={busy}
              className="text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
              <Mail size={15} /> {e.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste meeting notes to summarize…" className="flex-1 border rounded px-3 py-2 text-sm" />
          <button onClick={() => notes && meeting.mutate()} disabled={busy || !notes} className="text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg disabled:opacity-40">Summarize meeting</button>
        </div>
      </div>

      {busy && <div className="card text-center py-10 text-slate-400 text-sm">Drafting…</div>}

      {output && !busy && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">{String(output.type).replace(/_/g, ' ')}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${output.poweredBy === 'claude' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {output.poweredBy === 'claude' ? 'Claude' : 'template'}
              </span>
            </div>
            <button onClick={copy} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              {copied ? <><Check size={13} className="text-green-500" /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{output.text}</pre>
        </div>
      )}
    </div>
  );
}
