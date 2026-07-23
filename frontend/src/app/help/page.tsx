'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { helpApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  LifeBuoy, Search, MessageSquare, Ticket, BookOpen, Plus, Send, Star,
  ChevronRight, Sparkles, X, Clock, CheckCircle,
} from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700', PENDING: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-green-50 text-green-700', CLOSED: 'bg-slate-100 text-slate-500',
};
const CATEGORIES = ['Booking Issue', 'Payment', 'Refund', 'Wallet', 'Complaint', 'Lost Item', 'Technical', 'General Inquiry'];

export default function HelpCenter() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [kb, setKb] = useState<any[] | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: tickets = [] } = useQuery({ queryKey: ['my-tickets'], queryFn: helpApi.myTickets, enabled: isAuthenticated });
  const search = useMutation({ mutationFn: () => helpApi.searchKb(query), onSuccess: (r: any) => setKb(r) });

  const open = tickets.filter((t: any) => t.status === 'OPEN' || t.status === 'PENDING').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-indigo-600 text-white p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-2 mb-1"><LifeBuoy size={22} /> <span className="font-semibold text-lg">Help Center</span></div>
        <p className="text-white/80 text-sm mb-4">Find answers instantly, or reach our team. We’re here 24/7.</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
            <Search size={18} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && query && search.mutate()}
              placeholder="Search: refunds, baggage, change booking…" className="flex-1 text-sm text-slate-800 outline-none" />
          </div>
          <button onClick={() => query && search.mutate()} disabled={search.isPending} className="bg-white/20 hover:bg-white/30 rounded-xl px-4 text-sm font-medium">
            {search.isPending ? '…' : 'Search'}
          </button>
        </div>
      </div>

      {/* KB results */}
      {kb && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-slate-800 flex items-center gap-2"><BookOpen size={16} /> Knowledge base</div>
            <button onClick={() => setKb(null)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          {kb.length === 0 ? (
            <div className="text-sm text-slate-400 py-4 text-center">No articles matched. Try the AI assistant or raise a ticket.</div>
          ) : kb.map((a: any) => (
            <div key={a.id} className="border-t py-3 first:border-0">
              <div className="font-medium text-sm text-slate-800">{a.title}</div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-3">{a.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Sparkles, label: 'AI Assistant', hint: 'Ask anything', action: () => (window as any).dispatchEvent(new Event('open-chat')) },
          { icon: Plus, label: 'New Ticket', hint: 'Raise an issue', action: () => setShowNew(true) },
          { icon: Ticket, label: 'My Tickets', hint: `${open} open`, action: () => document.getElementById('my-tickets')?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: BookOpen, label: 'Guides', hint: 'How-tos', action: () => { setQuery('how to'); search.mutate(); } },
        ].map((t) => (
          <button key={t.label} onClick={t.action} className="card text-left hover:border-orange-200 transition-colors">
            <t.icon size={20} className="text-orange-600" />
            <div className="font-medium text-sm mt-2">{t.label}</div>
            <div className="text-xs text-slate-400">{t.hint}</div>
          </button>
        ))}
      </div>

      {/* My tickets */}
      <div id="my-tickets" className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-slate-800 flex items-center gap-2"><Ticket size={16} /> My tickets</div>
          <button onClick={() => setShowNew(true)} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={13} /> New</button>
        </div>
        {!isAuthenticated ? (
          <div className="text-center py-8 text-sm text-slate-400">
            <button onClick={() => router.push('/auth/login')} className="text-orange-600 font-medium">Sign in</button> to see your tickets.
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">No tickets yet. Raise one and we’ll help.</div>
        ) : (
          <div className="divide-y">
            {tickets.map((t: any) => (
              <button key={t.id} onClick={() => setOpenTicketId(t.id)} className="w-full text-left py-3 flex items-center justify-between gap-3 hover:bg-slate-50 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">{t.subject}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                    <span>{t.category || 'General'}</span>
                    {t.sla === 'BREACHED' && <span className="text-red-500">SLA breached</span>}
                    {t.rating && <span className="text-amber-500 flex items-center gap-0.5"><Star size={11} fill="currentColor" /> {t.rating}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={(id) => { qc.invalidateQueries({ queryKey: ['my-tickets'] }); setShowNew(false); setOpenTicketId(id); }} />}
      {openTicketId && <TicketDetail id={openTicketId} onClose={() => setOpenTicketId(null)} />}
    </div>
  );
}

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ subject: '', category: CATEGORIES[0], priority: 'MEDIUM', body: '' });
  const create = useMutation({ mutationFn: () => helpApi.createTicket(f), onSuccess: (t: any) => onCreated(t.id) });
  return (
    <Overlay title="New support ticket" onClose={onClose}>
      <div className="space-y-3">
        <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Subject" className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="border rounded-lg px-2 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className="border rounded-lg px-2 py-2 text-sm">
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Describe your issue…" rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => f.subject && create.mutate()} disabled={!f.subject || create.isPending} className="w-full bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40">
          {create.isPending ? 'Submitting…' : 'Submit ticket'}
        </button>
      </div>
    </Overlay>
  );
}

function TicketDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ['ticket', id], queryFn: () => helpApi.ticket(id) });
  const [msg, setMsg] = useState('');
  const [stars, setStars] = useState(0);
  const reply = useMutation({ mutationFn: () => helpApi.reply(id, msg), onSuccess: () => { setMsg(''); qc.invalidateQueries({ queryKey: ['ticket', id] }); qc.invalidateQueries({ queryKey: ['my-tickets'] }); } });
  const rate = useMutation({ mutationFn: (r: number) => helpApi.rate(id, r), onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); qc.invalidateQueries({ queryKey: ['my-tickets'] }); } });

  const canRate = t && (t.status === 'RESOLVED' || t.status === 'CLOSED') && !t.rating;

  return (
    <Overlay title={t?.subject || 'Ticket'} onClose={onClose}>
      {!t ? <div className="py-8 text-center text-slate-400 text-sm">Loading…</div> : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded ${STATUS_STYLE[t.status]}`}>{t.status}</span>
            <span className="text-slate-400">{t.category}</span>
            {t.minutesLeft != null && t.minutesLeft > 0 && <span className="text-slate-400 flex items-center gap-1"><Clock size={11} /> {t.minutesLeft}m to first response</span>}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 bg-slate-50 rounded-lg p-3">
            {(t.messages ?? []).length === 0 && <div className="text-xs text-slate-400 text-center py-2">No messages yet.</div>}
            {(t.messages ?? []).map((m: any) => (
              <div key={m.id} className={`flex ${m.authorRole === 'PASSENGER' ? 'justify-end' : ''}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.authorRole === 'PASSENGER' ? 'bg-orange-600 text-white' : 'bg-white border text-slate-800'}`}>
                  {m.body}
                  <div className={`text-[10px] mt-0.5 ${m.authorRole === 'PASSENGER' ? 'text-white/70' : 'text-slate-400'}`}>{m.authorRole === 'PASSENGER' ? 'You' : 'Support'} · {new Date(m.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {canRate ? (
            <div className="border-t pt-3">
              <div className="text-sm text-slate-600 mb-1.5">How was our support?</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onMouseEnter={() => setStars(n)} onMouseLeave={() => setStars(0)} onClick={() => rate.mutate(n)}>
                    <Star size={24} className={n <= stars ? 'text-amber-400' : 'text-slate-300'} fill={n <= stars ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          ) : t.rating ? (
            <div className="border-t pt-3 text-sm text-green-600 flex items-center gap-1"><CheckCircle size={14} /> You rated this {t.rating}★ — thank you!</div>
          ) : (
            <div className="flex gap-2">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && msg && reply.mutate()} placeholder="Reply…" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={() => msg && reply.mutate()} disabled={!msg || reply.isPending} className="bg-orange-600 text-white rounded-lg px-3 disabled:opacity-40"><Send size={16} /></button>
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}

function Overlay({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-slate-800 truncate pr-2">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
