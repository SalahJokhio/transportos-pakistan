'use client';
import { Play, Flag, Plus, Trash2, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';

const ROLES = ['COMPANY_ADMIN', 'FINANCE_OFFICER', 'BOOKING_AGENT', 'SUPER_ADMIN'];
type Step = { name: string; approverRole: string; slaHours?: number };

/**
 * Visual workflow builder — renders the approval chain as connected nodes on a
 * canvas (Start → step → step → Finish) with inline edit, insert-between,
 * reorder, and remove. A drag-drop-style builder without a graph library.
 */
export function VisualWorkflowBuilder({ steps, onChange }: { steps: Step[]; onChange: (s: Step[]) => void }) {
  const setStep = (i: number, k: keyof Step, v: string) =>
    onChange(steps.map((s, idx) => (idx === i ? { ...s, [k]: k === 'slaHours' ? (Number(v) || undefined) : v } : s)));
  const insertAt = (i: number) =>
    onChange([...steps.slice(0, i), { name: 'New step', approverRole: 'COMPANY_ADMIN' }, ...steps.slice(i)]);
  const remove = (i: number) => onChange(steps.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= steps.length) return;
    const copy = [...steps]; [copy[i], copy[j]] = [copy[j], copy[i]]; onChange(copy);
  };

  const Connector = ({ onAdd }: { onAdd: () => void }) => (
    <div className="flex flex-col items-center justify-center px-1 shrink-0">
      <ChevronRight size={16} className="text-slate-300" />
      <button onClick={onAdd} title="Insert step here" className="mt-1 w-5 h-5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:text-orange-500 flex items-center justify-center">
        <Plus size={11} />
      </button>
    </div>
  );

  return (
    <div className="border rounded-xl bg-slate-50/60 p-4 overflow-x-auto">
      <div className="flex items-stretch gap-1 min-w-max">
        {/* Start */}
        <div className="flex flex-col items-center justify-center bg-green-50 border border-green-200 rounded-lg px-3 py-4 shrink-0">
          <Play size={16} className="text-green-600" />
          <span className="text-[11px] text-green-700 mt-1 font-medium">Start</span>
        </div>

        {steps.map((s, i) => (
          <div key={i} className="flex items-stretch">
            <Connector onAdd={() => insertAt(i)} />
            {/* Step node */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 w-52 shrink-0 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-400">STEP {i + 1}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowLeft size={12} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowRight size={12} /></button>
                  <button onClick={() => remove(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
              <input value={s.name} onChange={(e) => setStep(i, 'name', e.target.value)} placeholder="Step name"
                className="w-full border rounded px-2 py-1 text-sm mb-1.5" />
              <select value={s.approverRole} onChange={(e) => setStep(i, 'approverRole', e.target.value)}
                className="w-full border rounded px-1.5 py-1 text-xs text-slate-600">
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        ))}

        <Connector onAdd={() => insertAt(steps.length)} />
        {/* Finish */}
        <div className="flex flex-col items-center justify-center bg-slate-100 border border-slate-200 rounded-lg px-3 py-4 shrink-0">
          <Flag size={16} className="text-slate-500" />
          <span className="text-[11px] text-slate-600 mt-1 font-medium">Approved</span>
        </div>
      </div>
      {steps.length === 0 && <div className="text-xs text-slate-400 mt-2">Click a + to add the first approval step.</div>}
    </div>
  );
}
