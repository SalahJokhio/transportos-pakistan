'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { staffAssistantApi } from '@/lib/api/admin';
import { Send, Bus, Wrench, User } from 'lucide-react';

type Persona = 'driver' | 'mechanic';
type Msg = { role: 'user' | 'assistant'; text: string; poweredBy?: string };

const INTRO: Record<Persona, string> = {
  driver: 'Assalam-o-Alaikum! Main aap ka Driver Assistant hoon — route, aaram/fatigue, fuel tips, safety, ya incident report ke liye poochein.',
  mechanic: 'Main Mechanic Assistant hoon — symptom batayein (brakes, overheating, smoke, tyres, no-start) aur main likely causes + parts suggest karunga.',
};
const SUGGEST: Record<Persona, string[]> = {
  driver: ['Motorway band hai, kya karun?', 'Fuel average kaise behtar karun?', 'Neend aa rahi hai', 'Incident kaise report karun?'],
  mechanic: ['Brake theek se nahi lag raha', 'Engine overheat ho raha hai', 'Exhaust se kaala dhuan', 'Bus start nahi ho rahi'],
};

/** Layer-1 personal assistants: Driver AI + Mechanic AI. */
export function StaffAssistantPanel() {
  const [persona, setPersona] = useState<Persona>('driver');
  const [msgs, setMsgs] = useState<Record<Persona, Msg[]>>({
    driver: [{ role: 'assistant', text: INTRO.driver }],
    mechanic: [{ role: 'assistant', text: INTRO.mechanic }],
  });
  const [q, setQ] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (message: string) => (persona === 'driver' ? staffAssistantApi.driver(message) : staffAssistantApi.mechanic(message)),
    onSuccess: (res: any) => setMsgs((m) => ({ ...m, [persona]: [...m[persona], { role: 'assistant', text: res.reply, poweredBy: res.poweredBy }] })),
    onError: () => setMsgs((m) => ({ ...m, [persona]: [...m[persona], { role: 'assistant', text: 'Maazrat, abhi jawab nahi de saka.' }] })),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, persona, ask.isPending]);

  const submit = (message: string) => {
    if (!message.trim()) return;
    setMsgs((m) => ({ ...m, [persona]: [...m[persona], { role: 'user', text: message }] }));
    setQ('');
    ask.mutate(message);
  };

  const list = msgs[persona];
  const accent = persona === 'driver' ? 'from-blue-500 to-indigo-500' : 'from-amber-500 to-orange-500';

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['driver', 'Driver AI', Bus], ['mechanic', 'Mechanic AI', Wrench]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setPersona(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${persona === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden flex flex-col" style={{ height: '64vh', minHeight: 440 }}>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
          {list.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-700' : `bg-gradient-to-br ${accent}`}`}>
                {m.role === 'user' ? <User size={14} className="text-white" /> : (persona === 'driver' ? <Bus size={14} className="text-white" /> : <Wrench size={14} className="text-white" />)}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-slate-700 text-white' : 'bg-white border text-gray-800'}`}>
                {m.text}
                {m.poweredBy && <div className="text-[10px] text-slate-400 mt-1">{m.poweredBy === 'claude' ? '· Claude' : '· guided'}</div>}
              </div>
            </div>
          ))}
          {ask.isPending && <div className="text-sm text-gray-400 pl-10">Soch raha hoon…</div>}
          <div ref={endRef} />
        </div>

        {list.length <= 1 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t bg-white">
            {SUGGEST[persona].map((s) => (
              <button key={s} onClick={() => submit(s)} className="text-xs border border-slate-200 hover:bg-slate-50 rounded-full px-3 py-1.5 text-slate-600">{s}</button>
            ))}
          </div>
        )}

        <div className="px-3 py-3 border-t bg-white flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit(q)}
            placeholder="Apna sawal likhein…" className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          <button onClick={() => submit(q)} disabled={ask.isPending || !q.trim()} className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-40 shrink-0"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
