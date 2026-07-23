'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { assistantApi } from '@/lib/api/endpoints';
import { MessageCircle, X, Send, Bus } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; content: string; trips?: any[] }

/** Floating AI booking assistant (Claude when configured, else rule-based). */
export function ChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: 'Assalam-o-alaikum! Route batayein, jaise "Karachi to Lahore kal", main buses dhoond deta hoon. 🚌' },
  ]);

  // Let other screens (e.g. the Help Center's AI Assistant tile) open the widget.
  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('open-chat', openHandler);
    return () => window.removeEventListener('open-chat', openHandler);
  }, []);

  // Passenger site only — hide on back-office consoles.
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/agent') || pathname?.startsWith('/driver')) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const history = msgs.map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const res: any = await assistantApi.chat(text, history);
      setMsgs((m) => [...m, { role: 'assistant', content: res.reply, trips: res.trips }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Sorry, kuch masla ho gaya. Dobara try karein.' }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700">
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm h-[70vh] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          <div className="bg-navy px-4 py-3 flex items-center gap-2" style={{ background: '#0F172A' }}>
            <Bus size={18} className="text-orange-500" />
            <span className="text-white font-semibold text-sm">TransportOS Assistant</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {msgs.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block rounded-2xl px-3 py-2 max-w-[85%] ${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-white border text-slate-700'}`}>
                  {m.content.split('\n').map((line, j) => <div key={j}>{line}</div>)}
                </div>
                {m.trips && m.trips.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.trips.map((t: any) => (
                      <button key={t.id} onClick={() => router.push(`/book/${t.id}`)}
                        className="block w-full text-left bg-white border rounded-lg px-3 py-2 text-xs hover:border-orange-400">
                        <span className="font-semibold">{t.origin} → {t.destination}</span> · {new Date(t.departureTime).toLocaleString()} · <span className="text-orange-600">Rs {t.basePrice}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400">typing…</div>}
          </div>
          <div className="p-2 border-t flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Kahan jana hai?" className="flex-1 border rounded-full px-3 py-2 text-sm" />
            <button onClick={send} disabled={busy} className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center disabled:opacity-40"><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
