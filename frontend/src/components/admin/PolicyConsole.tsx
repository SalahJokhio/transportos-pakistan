'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policyApi } from '@/lib/api/admin';
import { Shield, Save, Clock, Bed, Undo2, Fuel, Gauge, Timer } from 'lucide-react';

const KNOBS = [
  { key: 'maxWorkingHours', label: 'Max working hours / day', icon: Clock, unit: 'hrs' },
  { key: 'minRestHours', label: 'Min rest between shifts', icon: Bed, unit: 'hrs' },
  { key: 'maxRefundPct', label: 'Max refund', icon: Undo2, unit: '%' },
  { key: 'fuelLimitPerTrip', label: 'Fuel spend limit / trip', icon: Fuel, unit: 'Rs' },
  { key: 'speedLimitKmh', label: 'Speed limit', icon: Gauge, unit: 'km/h' },
  { key: 'lateArrivalGraceMin', label: 'Late-arrival grace', icon: Timer, unit: 'min' },
];

/** Policy Engine: configurable operating limits, enforced platform-wide. */
export function PolicyConsole() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['policies'], queryFn: policyApi.get });
  const [form, setForm] = useState<Record<string, number>>({});

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: () => policyApi.update(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800">
        <Shield size={20} className="text-orange-600" />
        <div>
          <div className="font-semibold">Policy Engine</div>
          <div className="text-xs text-gray-500">Operating limits. Breaches emit <code>POLICY_VIOLATION</code> events that rules & agents react to.</div>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid md:grid-cols-2 gap-4">
          {KNOBS.map(({ key, label, icon: Icon, unit }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0"><Icon size={16} className="text-orange-600" /></div>
              <div className="flex-1">
                <label className="text-sm text-gray-700">{label}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                    className="w-32 border rounded px-2 py-1.5 text-sm" />
                  <span className="text-xs text-slate-400">{unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="mt-5 bg-orange-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1 disabled:opacity-40">
          <Save size={14} /> {save.isPending ? 'Saving…' : save.isSuccess ? 'Saved ✓' : 'Save policies'}
        </button>
      </div>
    </div>
  );
}
