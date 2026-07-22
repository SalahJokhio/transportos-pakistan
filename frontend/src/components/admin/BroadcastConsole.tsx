'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Megaphone, Send, History } from 'lucide-react';

const SEGMENTS = ['ALL', 'PASSENGER', 'DRIVER', 'COMPANY_ADMIN', 'BOOKING_AGENT'];
const CHANNELS = ['SMS', 'WHATSAPP', 'PUSH', 'EMAIL'];

/** Broadcast center: send a message to a user segment and see past blasts. */
export function BroadcastConsole() {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: '', message: '', channel: 'SMS', segment: 'ALL' });
  const { data: history } = useQuery({ queryKey: ['admin-broadcasts'], queryFn: adminApi.getBroadcasts });
  const { data: size } = useQuery({ queryKey: ['segment-size', f.segment], queryFn: () => adminApi.segmentSize(f.segment) });

  const send = useMutation({
    mutationFn: () => adminApi.sendBroadcast(f),
    onSuccess: () => { setF({ ...f, title: '', message: '' }); qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }); },
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Compose */}
      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-gray-800 mb-4"><Megaphone size={16} /> New broadcast</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Segment
              <select value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })} className="mt-1 w-full border rounded px-2 py-2 text-sm">
                {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-sm">Channel
              <select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} className="mt-1 w-full border rounded px-2 py-2 text-sm">
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="text-xs text-gray-500">≈ {size?.total ?? '…'} recipient(s) in this segment</div>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title (optional)" className="w-full border rounded px-3 py-2 text-sm" />
          <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Message…" rows={4} className="w-full border rounded px-3 py-2 text-sm" />
          {(f.channel === 'PUSH' || f.channel === 'EMAIL') && (
            <div className="text-xs text-amber-600">{f.channel} channel is recorded but not yet wired to a provider — SMS/WhatsApp deliver live.</div>
          )}
          <button onClick={() => f.message && send.mutate()} disabled={send.isPending || !f.message}
            className="bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40">
            <Send size={14} /> {send.isPending ? 'Sending…' : send.isSuccess ? 'Sent ✓' : 'Send broadcast'}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold text-gray-800"><History size={16} /> Recent broadcasts</div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {(history ?? []).map((b: any) => (
            <div key={b.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.title || '(no title)'}</span>
                <span className="text-xs text-gray-400">{b.channel} · {b.segment}</span>
              </div>
              <div className="text-gray-500 text-xs mt-1 line-clamp-2">{b.message}</div>
              <div className="text-xs text-gray-400 mt-1">{b.recipientCount} recipients · {new Date(b.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {(history ?? []).length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No broadcasts yet.</div>}
        </div>
      </div>
    </div>
  );
}
