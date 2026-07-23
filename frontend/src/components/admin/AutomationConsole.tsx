'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationApi } from '@/lib/api/admin';
import { Zap, Plus, Trash2, FlaskConical, Bell, Activity, Power } from 'lucide-react';

// Events the platform emits today (extend as more emit points are wired).
const EVENT_TYPES = [
  'BOOKING_CREATED', 'BOOKING_CANCELLED', 'TRIP_STATUS_CHANGED', 'TRIP_DELAYED',
  'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'COMPLIANCE_EXPIRING',
];
const OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'exists'];
const ACTION_TYPES = ['alert', 'notify', 'webhook', 'log'];

type Cond = { field: string; op: string; value: string };
type Act = { type: string; [k: string]: any };

const blankRule = () => ({
  name: '',
  eventType: 'BOOKING_CREATED',
  conditions: [{ field: 'paymentMode', op: 'eq', value: 'COUNTER' }] as Cond[],
  actions: [{ type: 'alert', severity: 'warning', title: 'Counter (COD) booking', message: 'PNR {{payload.pnr}} — collect cash at counter' }] as Act[],
  priority: 0,
});

/** Rules + Event Engine console: no-code IF/THEN automation. */
export function AutomationConsole() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<any>(blankRule());
  const [sim, setSim] = useState('{\n  "pnr": "TOS-1234",\n  "paymentMode": "COUNTER",\n  "finalAmount": 4500\n}');
  const [simResult, setSimResult] = useState<any>(null);

  const { data: rules = [] } = useQuery({ queryKey: ['automation-rules'], queryFn: automationApi.listRules });
  const { data: alerts = [] } = useQuery({ queryKey: ['automation-alerts'], queryFn: () => automationApi.alerts() });
  const { data: events = [] } = useQuery({ queryKey: ['automation-events'], queryFn: () => automationApi.events() });

  const create = useMutation({
    mutationFn: () => automationApi.createRule({
      ...draft,
      conditions: draft.conditions.filter((c: Cond) => c.field),
      // coerce numeric-looking values so gt/lt compare as numbers
      priority: Number(draft.priority) || 0,
    }),
    onSuccess: () => { setDraft(blankRule()); qc.invalidateQueries({ queryKey: ['automation-rules'] }); },
  });
  const toggle = useMutation({
    mutationFn: (r: any) => automationApi.updateRule(r.id, { isActive: !r.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => automationApi.removeRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => automationApi.markAlertRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-alerts'] }),
  });

  const runSim = async () => {
    try { setSimResult(await automationApi.simulate(draft.eventType, JSON.parse(sim))); }
    catch { setSimResult({ error: 'Invalid JSON payload' }); }
  };

  const setCond = (i: number, k: keyof Cond, v: string) =>
    setDraft((d: any) => ({ ...d, conditions: d.conditions.map((c: Cond, idx: number) => idx === i ? { ...c, [k]: v } : c) }));
  const setAct = (i: number, k: string, v: string) =>
    setDraft((d: any) => ({ ...d, actions: d.actions.map((a: Act, idx: number) => idx === i ? { ...a, [k]: v } : a) }));

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rule builder */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold text-gray-800 mb-4"><Zap size={16} className="text-orange-600" /> New rule</div>
          <div className="space-y-3">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Rule name" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">When event
                <select value={draft.eventType} onChange={(e) => setDraft({ ...draft, eventType: e.target.value })} className="mt-1 w-full border rounded px-2 py-2 text-sm">
                  {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-sm">Priority
                <input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="mt-1 w-full border rounded px-2 py-2 text-sm" />
              </label>
            </div>

            {/* Conditions */}
            <div className="text-xs font-semibold text-gray-500 uppercase pt-1">IF all of</div>
            {draft.conditions.map((c: Cond, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={c.field} onChange={(e) => setCond(i, 'field', e.target.value)} placeholder="payload field" className="flex-1 border rounded px-2 py-1.5 text-sm" />
                <select value={c.op} onChange={(e) => setCond(i, 'op', e.target.value)} className="border rounded px-1 py-1.5 text-sm">
                  {OPS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input value={c.value} onChange={(e) => setCond(i, 'value', e.target.value)} placeholder="value" className="w-24 border rounded px-2 py-1.5 text-sm" />
                <button onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_: any, x: number) => x !== i) })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { field: '', op: 'eq', value: '' }] })}
              className="text-xs text-orange-600 flex items-center gap-1"><Plus size={12} /> condition</button>

            {/* Actions */}
            <div className="text-xs font-semibold text-gray-500 uppercase pt-1">THEN do</div>
            {draft.actions.map((a: Act, i: number) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-slate-50">
                <div className="flex gap-2 items-center">
                  <select value={a.type} onChange={(e) => setAct(i, 'type', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                    {ACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  {a.type === 'alert' && (
                    <select value={a.severity || 'info'} onChange={(e) => setAct(i, 'severity', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                      {['info', 'warning', 'critical'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}
                  {a.type === 'notify' && (
                    <select value={a.channel || 'sms'} onChange={(e) => setAct(i, 'channel', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                      {['sms', 'whatsapp', 'email', 'telegram', 'push', 'inapp'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}
                  <button onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_: any, x: number) => x !== i) })} className="text-gray-400 hover:text-red-500 ml-auto"><Trash2 size={14} /></button>
                </div>
                {a.type === 'alert' && <input value={a.title || ''} onChange={(e) => setAct(i, 'title', e.target.value)} placeholder="Alert title" className="w-full border rounded px-2 py-1.5 text-sm" />}
                {a.type === 'notify' && <input value={a.to || ''} onChange={(e) => setAct(i, 'to', e.target.value)} placeholder="Recipient (e.g. passengerPhone or a number)" className="w-full border rounded px-2 py-1.5 text-sm" />}
                {a.type === 'webhook' && <input value={a.url || ''} onChange={(e) => setAct(i, 'url', e.target.value)} placeholder="https://…" className="w-full border rounded px-2 py-1.5 text-sm" />}
                {(a.type === 'alert' || a.type === 'notify') && <input value={a.message || ''} onChange={(e) => setAct(i, 'message', e.target.value)} placeholder="Message — use {{payload.pnr}} tokens" className="w-full border rounded px-2 py-1.5 text-sm" />}
              </div>
            ))}
            <button onClick={() => setDraft({ ...draft, actions: [...draft.actions, { type: 'alert', severity: 'info', title: '', message: '' }] })}
              className="text-xs text-orange-600 flex items-center gap-1"><Plus size={12} /> action</button>

            <button onClick={() => draft.name && create.mutate()} disabled={!draft.name || create.isPending}
              className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40 w-full justify-center mt-2">
              <Plus size={14} /> {create.isPending ? 'Saving…' : 'Create rule'}
            </button>
          </div>
        </div>

        {/* Simulate */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold text-gray-800 mb-4"><FlaskConical size={16} className="text-indigo-600" /> Simulate (dry-run)</div>
          <div className="text-xs text-gray-500 mb-2">Test which rules would fire for a <b>{draft.eventType}</b> payload — no side-effects.</div>
          <textarea value={sim} onChange={(e) => setSim(e.target.value)} rows={7} className="w-full border rounded px-3 py-2 text-xs font-mono" />
          <button onClick={runSim} className="mt-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1">
            <FlaskConical size={14} /> Run simulation
          </button>
          {simResult && (
            <div className="mt-3 text-sm">
              {simResult.error
                ? <div className="text-red-500 text-xs">{simResult.error}</div>
                : simResult.length === 0
                  ? <div className="text-gray-400 text-xs">No rules match this payload.</div>
                  : <div className="space-y-1">{simResult.map((r: any) => (
                      <div key={r.id} className="text-xs bg-green-50 text-green-700 rounded px-2 py-1">✓ {r.name} — {r.actions?.length ?? 0} action(s)</div>
                    ))}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Rules list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-gray-800">Rules ({rules.length})</div>
        <div className="divide-y max-h-80 overflow-y-auto">
          {rules.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No rules yet — create one above.</div>}
          {rules.map((r: any) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm flex items-center gap-2">
                  {r.name}
                  {!r.companyId && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">PLATFORM</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  on <b>{r.eventType}</b> · {r.conditions?.length ?? 0} cond · {r.actions?.length ?? 0} action · fired {r.fireCount ?? 0}×
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle.mutate(r)} title={r.isActive ? 'Active' : 'Disabled'}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${r.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Power size={12} /> {r.isActive ? 'On' : 'Off'}
                </button>
                <button onClick={() => del.mutate(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts inbox + Event log */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><Bell size={16} /> Alert inbox</div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {alerts.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No alerts yet.</div>}
            {alerts.map((a: any) => (
              <div key={a.id} className={`px-4 py-2.5 text-sm ${a.isRead ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                    {a.title}
                  </span>
                  {!a.isRead && <button onClick={() => markRead.mutate(a.id)} className="text-[11px] text-orange-600">mark read</button>}
                </div>
                {a.message && <div className="text-xs text-gray-500 mt-0.5">{a.message}</div>}
                <div className="text-[11px] text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><Activity size={16} /> Event log</div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {events.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No events yet.</div>}
            {events.map((e: any) => (
              <div key={e.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{e.type}</span>
                  {e.matchedRules > 0 && <span className="text-[11px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">{e.matchedRules} fired</span>}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{e.source} · {new Date(e.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
