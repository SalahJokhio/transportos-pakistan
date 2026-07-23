'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/lib/api/admin';
import { GitBranch, Plus, Trash2, Play, Check, X, Inbox, ListChecks, ChevronRight, LayoutList, Workflow } from 'lucide-react';
import { VisualWorkflowBuilder } from './VisualWorkflowBuilder';

const ROLES = ['COMPANY_ADMIN', 'FINANCE_OFFICER', 'BOOKING_AGENT', 'SUPER_ADMIN'];
const CATEGORIES = ['PURCHASE', 'REFUND', 'LEAVE', 'MAINTENANCE', 'GENERAL'];
const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600', CANCELLED: 'bg-slate-100 text-slate-500',
};

/** Approval Workflow Engine: design chains, start requests, approve/reject. */
export function WorkflowConsole() {
  const qc = useQueryClient();
  const [view, setView] = useState<'inbox' | 'requests' | 'design'>('inbox');
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wf-inbox'] });
    qc.invalidateQueries({ queryKey: ['wf-instances'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['inbox', 'My approvals', Inbox], ['requests', 'All requests', ListChecks], ['design', 'Design chains', GitBranch]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {view === 'inbox' && <InboxView onChange={invalidate} />}
      {view === 'requests' && <RequestsView />}
      {view === 'design' && <DesignView />}
    </div>
  );
}

// ── My approvals ──────────────────────────────────────────────────────
function InboxView({ onChange }: { onChange: () => void }) {
  const { data: inbox = [] } = useQuery({ queryKey: ['wf-inbox'], queryFn: workflowApi.inbox });
  const act = useMutation({
    mutationFn: ({ id, action, note }: any) => action === 'approve' ? workflowApi.approve(id, note) : workflowApi.reject(id, note),
    onSuccess: onChange,
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (inbox.length === 0) return <div className="card text-center py-10 text-slate-400 text-sm">Nothing awaiting your approval.</div>;
  return (
    <div className="space-y-3">
      {inbox.map((i: any) => {
        const step = i.steps?.[i.currentStep];
        return (
          <div key={i.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{i.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Step {i.currentStep + 1}/{i.steps?.length}: <b>{step?.name}</b>
                  {i.amount != null && <> · Rs {Number(i.amount).toLocaleString()}</>}
                </div>
              </div>
              <StepTrail inst={i} />
            </div>
            <div className="flex gap-2 items-center mt-3">
              <input value={notes[i.id] || ''} onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })}
                placeholder="Note (optional)" className="flex-1 border rounded px-2 py-1.5 text-sm" />
              <button onClick={() => act.mutate({ id: i.id, action: 'approve', note: notes[i.id] })} disabled={act.isPending}
                className="bg-green-600 text-white text-sm px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-40"><Check size={14} /> Approve</button>
              <button onClick={() => act.mutate({ id: i.id, action: 'reject', note: notes[i.id] })} disabled={act.isPending}
                className="bg-red-500 text-white text-sm px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-40"><X size={14} /> Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── All requests ──────────────────────────────────────────────────────
function RequestsView() {
  const { data: instances = [] } = useQuery({ queryKey: ['wf-instances'], queryFn: () => workflowApi.listInstances() });
  if (instances.length === 0) return <div className="card text-center py-10 text-slate-400 text-sm">No requests yet.</div>;
  return (
    <div className="space-y-3">
      {instances.map((i: any) => (
        <div key={i.id} className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold flex items-center gap-2">
                {i.title}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${STATUS_BADGE[i.status]}`}>{i.status}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {i.amount != null && <>Rs {Number(i.amount).toLocaleString()} · </>}
                {new Date(i.createdAt).toLocaleString()}
              </div>
            </div>
            <StepTrail inst={i} />
          </div>
          {i.history?.length > 1 && (
            <div className="mt-3 border-t pt-2 space-y-1">
              {i.history.filter((h: any) => h.action !== 'started').map((h: any, x: number) => (
                <div key={x} className="text-xs text-slate-500 flex items-center gap-1.5">
                  {h.action === 'approved' ? <Check size={11} className="text-green-500" /> : <X size={11} className="text-red-500" />}
                  <b>{h.stepName}</b> {h.action} {h.byRole ? `by ${h.byRole}` : ''} {h.note ? `— “${h.note}”` : ''}
                  <span className="text-slate-400">· {new Date(h.at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Little step-progress trail. */
function StepTrail({ inst }: { inst: any }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {(inst.steps || []).map((s: any, idx: number) => {
        const done = inst.status === 'APPROVED' || idx < inst.currentStep;
        const active = inst.status === 'PENDING' && idx === inst.currentStep;
        const rejected = inst.status === 'REJECTED' && idx === inst.currentStep;
        return (
          <div key={idx} className="flex items-center gap-1" title={`${s.name} (${s.approverRole})`}>
            <span className={`w-2.5 h-2.5 rounded-full ${rejected ? 'bg-red-500' : done ? 'bg-green-500' : active ? 'bg-amber-500' : 'bg-slate-200'}`} />
            {idx < inst.steps.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Design chains ─────────────────────────────────────────────────────
function DesignView() {
  const qc = useQueryClient();
  const { data: defs = [] } = useQuery({ queryKey: ['wf-defs'], queryFn: workflowApi.listDefinitions });
  const [draft, setDraft] = useState<any>({ name: '', category: 'PURCHASE', steps: [{ name: 'Supervisor review', approverRole: 'COMPANY_ADMIN' }] });
  const [startFor, setStartFor] = useState<any>(null);
  const [mode, setMode] = useState<'visual' | 'list'>('visual');

  const create = useMutation({ mutationFn: () => workflowApi.createDefinition(draft), onSuccess: () => { setDraft({ name: '', category: 'PURCHASE', steps: [{ name: 'Supervisor review', approverRole: 'COMPANY_ADMIN' }] }); qc.invalidateQueries({ queryKey: ['wf-defs'] }); } });
  const install = useMutation({ mutationFn: () => workflowApi.installTemplates(), onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-defs'] }) });
  const del = useMutation({ mutationFn: (id: string) => workflowApi.removeDefinition(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-defs'] }) });

  const setStep = (i: number, k: string, v: string) => setDraft((d: any) => ({ ...d, steps: d.steps.map((s: any, x: number) => x === i ? { ...s, [k]: v } : s) }));

  return (
    <div className="space-y-6">
      {/* Builder */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold text-gray-800"><GitBranch size={16} className="text-orange-600" /> New approval chain</div>
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button onClick={() => setMode('visual')} className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 ${mode === 'visual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><Workflow size={12} /> Visual</button>
            <button onClick={() => setMode('list')} className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 ${mode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><LayoutList size={12} /> List</button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Chain name (e.g. Purchase Request)" className="w-full border rounded px-3 py-2 text-sm" />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-full border rounded px-2 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {mode === 'visual' ? (
            <VisualWorkflowBuilder steps={draft.steps} onChange={(steps) => setDraft({ ...draft, steps })} />
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-500 uppercase pt-1">Approval steps (in order)</div>
              {draft.steps.map((s: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                  <input value={s.name} onChange={(e) => setStep(i, 'name', e.target.value)} placeholder="Step name" className="flex-1 border rounded px-2 py-1.5 text-sm" />
                  <select value={s.approverRole} onChange={(e) => setStep(i, 'approverRole', e.target.value)} className="border rounded px-1 py-1.5 text-sm">
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_: any, x: number) => x !== i) })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => setDraft({ ...draft, steps: [...draft.steps, { name: '', approverRole: 'FINANCE_OFFICER' }] })} className="text-xs text-orange-600 flex items-center gap-1"><Plus size={12} /> step</button>
            </>
          )}

          <button onClick={() => draft.name && draft.steps.length && create.mutate()} disabled={!draft.name || !draft.steps.length || create.isPending}
            className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40 justify-center mt-2"><Plus size={14} /> Create chain</button>
        </div>
      </div>

      {/* Existing definitions */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-gray-800 flex items-center justify-between">
          <span>Chains ({defs.length})</span>
          <button onClick={() => install.mutate()} disabled={install.isPending}
            className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-lg disabled:opacity-40">
            {install.isPending ? 'Installing…' : install.isSuccess ? `Installed ${(install.data as any)?.installed ?? 0}` : 'Install standard templates'}
          </button>
        </div>
        <div className="divide-y max-h-[460px] overflow-y-auto">
          {defs.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No chains yet.</div>}
          {defs.map((dfn: any) => (
            <div key={dfn.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm flex items-center gap-2">
                  {dfn.name}
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{dfn.category}</span>
                  {!dfn.companyId && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">PLATFORM</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStartFor(dfn)} className="text-xs text-orange-600 flex items-center gap-1"><Play size={12} /> start</button>
                  <button onClick={() => del.mutate(dfn.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center flex-wrap gap-1">
                {(dfn.steps || []).map((s: any, x: number) => (
                  <span key={x} className="flex items-center gap-1">
                    <span className="bg-slate-50 border rounded px-1.5 py-0.5">{s.name} <span className="text-slate-400">({s.approverRole})</span></span>
                    {x < dfn.steps.length - 1 && <ChevronRight size={11} className="text-slate-300" />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {startFor && <StartModal def={startFor} onClose={() => setStartFor(null)} onStarted={() => { setStartFor(null); qc.invalidateQueries({ queryKey: ['wf-instances'] }); }} />}
    </div>
  );
}

function StartModal({ def, onClose, onStarted }: { def: any; onClose: () => void; onStarted: () => void }) {
  const [f, setF] = useState({ title: '', amount: '' });
  const start = useMutation({
    mutationFn: () => workflowApi.start({ definitionId: def.id, title: f.title, amount: f.amount ? Number(f.amount) : undefined }),
    onSuccess: onStarted,
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold mb-3">Start: {def.name}</div>
        <div className="space-y-3">
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Request title (e.g. 4 new tyres for LHR-1234)" className="w-full border rounded px-3 py-2 text-sm" />
          <input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="Amount (Rs, optional)" className="w-full border rounded px-3 py-2 text-sm" />
          <div className="text-xs text-slate-500">Routes through: {(def.steps || []).map((s: any) => s.name).join(' → ')}</div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="text-sm px-3 py-1.5 text-slate-500">Cancel</button>
            <button onClick={() => f.title && start.mutate()} disabled={!f.title || start.isPending} className="bg-orange-600 text-white text-sm px-4 py-1.5 rounded disabled:opacity-40">Start request</button>
          </div>
        </div>
      </div>
    </div>
  );
}
