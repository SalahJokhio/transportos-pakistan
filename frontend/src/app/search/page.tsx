'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { tripApi } from '@/lib/api/endpoints';
import { Bus, Clock, MapPin, Armchair, ArrowRight, Train, Plane, Navigation } from 'lucide-react';

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDuration(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`;
}

const TRANSPORT_TABS = [
  { key: '', label: 'All', icon: <Navigation size={14} /> },
  { key: 'BUS', label: 'Bus', icon: <Bus size={14} /> },
  { key: 'TRAIN', label: 'Train', icon: <Train size={14} /> },
  { key: 'AIRLINE', label: 'Airline', icon: <Plane size={14} /> },
];

const TRANSPORT_ICON: Record<string, React.ReactNode> = {
  BUS: <Bus size={14} className="text-orange-500" />,
  TRAIN: <Train size={14} className="text-blue-500" />,
  AIRLINE: <Plane size={14} className="text-purple-500" />,
  FERRY: <Navigation size={14} className="text-teal-500" />,
};

export default function SearchPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [transportType, setTransportType] = useState('');

  const params = {
    originCity: sp.get('originCity') || '',
    destinationCity: sp.get('destinationCity') || '',
    date: sp.get('date') || '',
    passengers: Number(sp.get('passengers') || 1),
  };

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['trips', params, transportType],
    queryFn: () => tripApi.search({ ...params, transportType: transportType || undefined }),
    enabled: !!(params.originCity && params.destinationCity && params.date),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Route header */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <MapPin size={14} className="text-orange-500" />
        <span className="font-semibold text-slate-800">{params.originCity}</span>
        <ArrowRight size={14} />
        <span className="font-semibold text-slate-800">{params.destinationCity}</span>
        <span className="ml-2">· {new Date(params.date).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {/* Transport type filter tabs */}
      <div className="flex gap-2 mb-6">
        {TRANSPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTransportType(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              transportType === tab.key
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card h-28 animate-pulse bg-slate-50" />)}
        </div>
      )}

      {error && <div className="card text-center text-red-500 py-12">Could not load trips. Make sure the API is running.</div>}

      {!isLoading && trips?.length === 0 && (
        <div className="card text-center py-16">
          <Bus size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500">No {transportType || 'transport'} found for this route on this date.</p>
          {transportType && (
            <button onClick={() => setTransportType('')} className="mt-3 text-sm text-orange-600 hover:underline">
              Show all transport types
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {trips?.map((trip: any) => (
          <div key={trip.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-2xl font-bold">{formatTime(trip.departureTime)}</div>
                  <div className="text-sm text-slate-500">{params.originCity}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-1 justify-center">
                    {TRANSPORT_ICON[trip.transportType] ?? TRANSPORT_ICON['BUS']}
                    <span>{trip.route ? formatDuration(trip.route.estimatedMinutes) : '—'}</span>
                  </div>
                  <div className="w-24 h-0.5 bg-slate-200 relative">
                    <div className="absolute -top-1.5 right-0 w-3 h-3 rounded-full bg-orange-500" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatTime(trip.estimatedArrivalTime)}</div>
                  <div className="text-sm text-slate-500">{params.destinationCity}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">Rs {trip.basePrice?.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-sm text-green-600 justify-end mt-1">
                  <Armchair size={14} />
                  {trip.availableSeats} seats left
                </div>
                <button
                  onClick={() => router.push(`/book/${trip.id}`)}
                  className="btn-primary mt-3 text-sm py-2 px-5"
                  disabled={trip.availableSeats === 0}
                >
                  Select Seats
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
