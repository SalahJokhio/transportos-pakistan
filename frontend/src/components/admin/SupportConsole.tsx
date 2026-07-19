'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { LifeBuoy, Send, Clock, AlertTriangle } from 'lucide-react';

const slaBadge = (sla: string) =>
  sla === 'BREACHED' ? 'bg-red-100 text-red-700' : sla === 'MET' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
const statusBadge = (s: string) =>
  s === 'RESOLVED' || s === 'CLOSED' ? 'bg-green-100 text-green-700' : s === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';

/** Support/ticketing console: SLA-aware ticket queue + thread with canned replies. */
export function SupportConsole() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: tickets } = useQuery({ queryKey: ['support-tickets'], queryFn: () => adminApi.getTickets() });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Queue */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><LifeBuoy size={16} /> Tickets</div>
        <div className="divide-y max-h-[520px] overflow-y-auto">
          {(tickets ?? []).map((t: any) => (
            <button key={t.id} onClick={() => setOpenId(t.id)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${openId === t.id ? 'bg-orange-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{t.subject}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${slaBadge(t.sla)}`}>
                  {t.sla === 'BREACHED' ? <AlertTriangle size={10} className="inline" /> : <Clock size={10} className="inline" />} {t.sla}{t.minutesLeft != null ? ` ${t.minutesLeft}m` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge(t.status)}`}>{t.status}</span>
                <span className="text-[10px] text-gray-400">{t.priority} · {t.requesterName || 'Guest'}</span>
              </div>
            </button>
          ))}
          {(tickets ?? []).length === 0 && <div className="px-4 py-10 text-center text-gray-400 text-sm">No tickets yet.</div>}
        </div>
      </div>

      {/* Detail */}
      <div>{openId ? <TicketDetail id={openId} qc={qc} /> : <div className="card p-10 text-center text-gray-400 text-sm">Select a ticket to view the thread.</div>}</div>
    </div>
  );
}

function TicketDetail({ id, qc }: { id: string; qc: any }) {
  const { data: t } = useQuery({ queryKey: ['support-ticket', id], queryFn: () => adminApi.getTicket(id) });
  const { data: canned } = useQuery({ queryKey: ['support-canned'], queryFn: adminApi.getCannedReplies });
  const [reply, setReply] = useState('');

  const inv = () => { qc.invalidateQueries({ queryKey: ['support-ticket', id] }); qc.invalidateQueries({ queryKey: ['support-tickets'] }); };
  const sendReply = useMutation({ mutationFn: () => adminApi.replyTicket(id, reply), onSuccess: () => { setReply(''); inv(); } });
  const setStatus = useMutation({ mutationFn: (status: string) => adminApi.updateTicket(id, { status }), onSuccess: inv });

  if (!t) return <div className="card p-6 text-gray-400">Loading…</div>;

  return (
    <div className="card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between border-b pb-3 mb-3">
        <div>
          <div className="font-semibold">{t.subject}</div>
          <div className="text-xs text-gray-400">{t.requesterName || 'Guest'} · {t.priority} · {t.status}</div>
        </div>
        <div className="flex gap-1">
          {['PENDING', 'RESOLVED', 'CLOSED'].map((s) => (
            <button key={s} onClick={() => setStatus.mutate(s)} className="text-[10px] px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto mb-3">
        {(t.messages ?? []).map((m: any) => (
          <div key={m.id} className={`text-sm rounded-lg p-2 ${m.authorRole && m.authorRole !== 'PASSENGER' ? 'bg-orange-50 ml-6' : 'bg-gray-50 mr-6'}`}>
            <div className="text-[10px] text-gray-400 mb-0.5">{m.authorRole || 'Passenger'} · {new Date(m.createdAt).toLocaleString()}</div>
            {m.body}
          </div>
        ))}
        {(t.messages ?? []).length === 0 && <div className="text-gray-400 text-sm">No messages yet.</div>}
      </div>

      <div className="mt-auto">
        {(canned ?? []).length > 0 && (
          <select onChange={(e) => e.target.value && setReply(e.target.value)} value="" className="w-full border rounded px-2 py-1.5 text-xs mb-2 text-gray-500">
            <option value="">Insert canned reply…</option>
            {(canned ?? []).map((c: any, i: number) => <option key={i} value={c.body}>{c.title}</option>)}
          </select>
        )}
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Type a reply…" className="w-full border rounded px-3 py-2 text-sm" />
        <button onClick={() => reply && sendReply.mutate()} disabled={sendReply.isPending || !reply} className="mt-2 bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40">
          <Send size={13} /> Reply
        </button>
      </div>
    </div>
  );
}
