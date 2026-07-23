'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api/admin';
import { BookOpen, Plus, Trash2, Search, Sparkles } from 'lucide-react';

const CATEGORIES = ['SOP', 'POLICY', 'MANUAL', 'FAQ', 'COMPLIANCE'];
const CAT_STYLE: Record<string, string> = {
  SOP: 'bg-blue-50 text-blue-700', POLICY: 'bg-orange-50 text-orange-700', MANUAL: 'bg-purple-50 text-purple-700',
  FAQ: 'bg-green-50 text-green-700', COMPLIANCE: 'bg-red-50 text-red-600',
};

/** Enterprise Knowledge Base — SOPs/policies/FAQs that ground the Copilot (RAG). */
export function KnowledgeConsole() {
  const qc = useQueryClient();
  const { data: articles = [] } = useQuery({ queryKey: ['kb'], queryFn: () => knowledgeApi.list() });
  const [draft, setDraft] = useState<any>({ title: '', category: 'SOP', body: '', tags: '' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);

  const create = useMutation({
    mutationFn: () => knowledgeApi.create({ ...draft, tags: draft.tags ? draft.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [] }),
    onSuccess: () => { setDraft({ title: '', category: 'SOP', body: '', tags: '' }); qc.invalidateQueries({ queryKey: ['kb'] }); },
  });
  const del = useMutation({ mutationFn: (id: string) => knowledgeApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['kb'] }) });
  const search = useMutation({ mutationFn: () => knowledgeApi.search(query), onSuccess: (r: any) => setResults(r) });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <BookOpen size={20} className="text-indigo-600" />
        <div>
          <div className="font-semibold">Knowledge Base</div>
          <div className="text-xs text-gray-500">SOPs, policies & FAQs. The Copilot retrieves these to ground its answers (RAG).</div>
        </div>
      </div>

      {/* RAG search tester */}
      <div className="card p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1"><Sparkles size={12} /> Retrieval test</div>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && query && search.mutate()}
            placeholder="Ask something the KB should answer…" className="flex-1 border rounded px-3 py-2 text-sm" />
          <button onClick={() => query && search.mutate()} disabled={search.isPending} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40"><Search size={14} /> Retrieve</button>
        </div>
        {results && (
          <div className="mt-3 space-y-1.5">
            {results.length === 0 && <div className="text-xs text-slate-400">No relevant articles.</div>}
            {results.map((r: any) => (
              <div key={r.id} className="text-sm bg-indigo-50/60 rounded px-3 py-2">
                <span className="font-medium">{r.title}</span> <span className="text-[11px] text-slate-400">score {r.score}</span>
                <div className="text-xs text-slate-500 line-clamp-2">{r.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add article */}
        <div className="card p-5">
          <div className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus size={16} className="text-indigo-600" /> New article</div>
          <div className="space-y-3">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title (e.g. Refund Policy)" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Category
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-1 w-full border rounded px-2 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">Tags (comma-sep)
                <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="refund, cancel" className="mt-1 w-full border rounded px-2 py-2 text-sm" />
              </label>
            </div>
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Article body — the knowledge the Copilot should use…" rows={6} className="w-full border rounded px-3 py-2 text-sm" />
            <button onClick={() => draft.title && draft.body && create.mutate()} disabled={!draft.title || !draft.body || create.isPending}
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40"><Plus size={14} /> Add article</button>
          </div>
        </div>

        {/* Articles list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-gray-800">Articles ({articles.length})</div>
          <div className="divide-y max-h-[460px] overflow-y-auto">
            {articles.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">No articles yet.</div>}
            {articles.map((a: any) => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {a.title}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${CAT_STYLE[a.category] ?? 'bg-slate-100 text-slate-600'}`}>{a.category}</span>
                    {!a.companyId && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">PLATFORM</span>}
                  </div>
                  <button onClick={() => del.mutate(a.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{a.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
