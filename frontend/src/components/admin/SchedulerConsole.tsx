'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulerApi } from '@/lib/api/admin';
import { Clock, Play, Power, Trash2, Download } from 'lucide-react';

const FREQ: Record<string, string> = { HOURLY: 'Hourly', DAILY: 'Daily', WEEKLY: 'Weekly' };

/** Scheduling + Automation Engine: configurable jobs that run on a cadence. */
export function SchedulerConsole() {
  const qc = useQueryClient();
  const { data: jobs = [] } = useQuery({ queryKey: ['scheduler-jobs'], queryFn: schedulerApi.jobs });
  const inval = () => qc.invalidateQueries({ queryKey: ['scheduler-jobs'] });

  const install = useMutation({ mutationFn: () => schedulerApi.installDefaults(), onSuccess: inval });
  const run = useMutation({ mutationFn: (id: string) => schedulerApi.run(id), onSuccess: inval });
  const toggle = useMutation({ mutationFn: (id: string) => schedulerApi.toggle(id), onSuccess: inval });
  const del = useMutation({ mutationFn: (id: string) => schedulerApi.remove(id), onSuccess: inval });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <Clock size={20} className="text-orange-600" />
          <div>
            <div className="font-semibold">Scheduling & Automation</div>
            <div className="text-xs text-gray-500">Configurable jobs run automatically on their cadence (dispatcher every 30 min).</div>
          </div>
        </div>
        {jobs.length === 0 && (
          <button onClick={() => install.mutate()} disabled={install.isPending}
            className="text-sm bg-orange-600 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
            <Download size={15} /> Install standard jobs
          </button>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="card text-center py-10 text-slate-400 text-sm">No jobs yet — install the standard set.</div>
      ) : (
        <div className="space-y-2.5">
          {jobs.map((j: any) => (
            <div key={j.id} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {j.name}
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{FREQ[j.frequency] ?? j.frequency}</span>
                  {!j.companyId && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">PLATFORM</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {j.lastRunAt ? <>last run {new Date(j.lastRunAt).toLocaleString()} · {j.lastResult}</> : 'never run'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => run.mutate(j.id)} disabled={run.isPending} title="Run now"
                  className="text-xs border border-orange-200 text-orange-600 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Play size={12} /> Run</button>
                <button onClick={() => toggle.mutate(j.id)} title={j.isActive ? 'Active' : 'Paused'}
                  className={`text-xs flex items-center gap-1 px-2 py-1.5 rounded-lg ${j.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}><Power size={12} /> {j.isActive ? 'On' : 'Off'}</button>
                <button onClick={() => del.mutate(j.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
