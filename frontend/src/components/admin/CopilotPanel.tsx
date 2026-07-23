'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { copilotApi, aiApi } from '@/lib/api/admin';
import { Sparkles, Send, User } from 'lucide-react';

const SUGGESTIONS = [
  'Aaj ka revenue kitna hai?',
  'Sabse profitable routes kaun se hain?',
  'Cancel rate kya hai?',
  'Payment methods ka breakdown dikhao',
  'Agle hafte demand kis route par zyada hogi?',
];

type Msg = { role: 'user' | 'assistant'; text: string; poweredBy?: string };

/** Executive AI Copilot — ask natural-language questions about the business. */
export function CopilotPanel() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: 'Assalam-o-Alaikum! Main aap ka Executive Copilot hoon. Revenue, routes, bookings, ya performance ke baare mein kuch bhi poochein.' },
  ]);
  const [q, setQ] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { data: mem } = useQuery({ queryKey: ['ai-memory-me'], queryFn: aiApi.memoryMe });

  const ask = useMutation({
    mutationFn: (question: string) => copilotApi.ask(question),
    onSuccess: (res: any) => setMsgs((m) => [...m, { role: 'assistant', text: res.answer, poweredBy: res.poweredBy }]),
    onError: () => setMsgs((m) => [...m, { role: 'assistant', text: 'Maazrat — abhi jawab nahi de saka. Dobara koshish karein.' }]),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, ask.isPending]);

  const submit = (question: string) => {
    if (!question.trim()) return;
    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setQ('');
    ask.mutate(question);
  };

  return (
    <div className="card p-0 overflow-hidden flex flex-col" style={{ height: '70vh', minHeight: 480 }}>
      <div className="px-4 py-3 border-b flex items-center gap-2 bg-gradient-to-r from-orange-50 to-indigo-50">
        <Sparkles size={18} className="text-orange-600" />
        <div>
          <div className="font-semibold text-gray-800">Executive Copilot</div>
          <div className="text-xs text-gray-500">
            {(mem as any)?.known
              ? <>Remembers you: usually {(mem as any).frequentRoute}{(mem as any).preferredPayment ? ` · ${(mem as any).preferredPayment}` : ''}</>
              : 'Natural-language answers grounded in your live data'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-orange-500 to-indigo-500'}`}>
              {m.role === 'user' ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-slate-700 text-white' : 'bg-white border text-gray-800'}`}>
              {m.text}
              {m.poweredBy === 'rules' && <div className="text-[10px] text-slate-400 mt-1">· computed from live data</div>}
              {m.poweredBy === 'claude' && <div className="text-[10px] text-indigo-400 mt-1">· Claude, grounded in your data</div>}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-indigo-500 flex items-center justify-center"><Sparkles size={14} className="text-white" /></div>
            <div className="bg-white border rounded-2xl px-3.5 py-2.5 text-sm text-gray-400">Soch raha hoon…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {msgs.length <= 1 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t bg-white">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => submit(s)} className="text-xs border border-slate-200 hover:border-orange-300 hover:bg-orange-50 rounded-full px-3 py-1.5 text-slate-600">{s}</button>
          ))}
        </div>
      )}

      <div className="px-3 py-3 border-t bg-white flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(q)}
          placeholder="Apna sawal likhein… (English/Urdu)"
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
        />
        <button onClick={() => submit(q)} disabled={ask.isPending || !q.trim()}
          className="bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-40 shrink-0">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
