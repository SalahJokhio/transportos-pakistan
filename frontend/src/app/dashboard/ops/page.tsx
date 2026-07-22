'use client';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { trackingApi } from '@/lib/api/endpoints';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { Radio } from 'lucide-react';

const OpsMap = dynamic(() => import('@/components/tracking/OpsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[70vh] rounded-xl border bg-slate-50 animate-pulse" />,
});

/** Live operations map — every active bus, refreshed every 10s. */
export default function OpsPage() {
  const { data } = useQuery({ queryKey: ['ops-live'], queryFn: trackingApi.live, refetchInterval: 10000 });
  const buses = data?.buses ?? [];

  return (
    <>
      <OperatorNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Radio size={20} className="text-orange-600" /> Live ops map</h1>
            <p className="text-slate-500 text-sm">Buses that pinged GPS in the last 30 minutes.</p>
          </div>
          <span className="text-sm font-semibold bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full">{buses.length} live</span>
        </div>
        <OpsMap buses={buses} />
        {buses.length === 0 && (
          <p className="text-center text-slate-400 text-sm mt-4">No buses transmitting right now. Positions appear when drivers start a trip and send GPS.</p>
        )}
      </div>
    </>
  );
}
