'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { Bus, MapPin, Clock, Play, Square, Navigation, CheckCircle } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  BOARDING: 'bg-yellow-100 text-yellow-700',
  DEPARTED: 'bg-orange-100 text-orange-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  ARRIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

function fmt(d: string) {
  return new Date(d).toLocaleString('en-PK', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function DriverPage() {
  const { isAuthenticated, user } = useAuthStore();
  const qc = useQueryClient();
  const [pinging, setPinging] = useState<string | null>(null);

  const { data: trips, isLoading } = useQuery({
    queryKey: ['driver-trips'],
    queryFn: () => driverApi.myTrips(),
    enabled: isAuthenticated,
  });

  const startMut = useMutation({
    mutationFn: (tripId: string) => driverApi.startTrip(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver-trips'] }),
  });
  const endMut = useMutation({
    mutationFn: (tripId: string) => driverApi.endTrip(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver-trips'] }),
  });

  // Send the device's real GPS position for a trip.
  const sendLocation = (tripId: string) => {
    if (!navigator.geolocation) return alert('Geolocation not available');
    setPinging(tripId);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await driverApi.ping({
          tripId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ?? 0,
        });
        setPinging(null);
      },
      () => { alert('Could not get location'); setPinging(null); },
      { enableHighAccuracy: true },
    );
  };

  if (!isAuthenticated) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500">Please log in as a driver to see your trips.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Bus className="text-orange-600" size={22} />
        <h1 className="text-2xl font-bold">Driver Console</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">{user?.firstName ? `Welcome, ${user.firstName}` : 'Your assigned trips today'}</p>

      {isLoading && <div className="card h-24 animate-pulse bg-slate-50" />}

      {!isLoading && (!trips || trips.length === 0) && (
        <div className="card text-center py-16 text-slate-500">
          <Bus size={40} className="mx-auto text-slate-200 mb-3" />
          No trips assigned to you today.
        </div>
      )}

      <div className="space-y-4">
        {trips?.map((t: any) => (
          <div key={t.id} className="card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Clock size={14} /> {fmt(t.departureTime)}
                </div>
                <div className="flex items-center gap-1.5 font-semibold mt-1">
                  <MapPin size={14} className="text-orange-500" /> Trip {t.id.slice(0, 8)}
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_BADGE[t.status] || 'bg-slate-100 text-slate-500'}`}>
                {t.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {['SCHEDULED', 'BOARDING'].includes(t.status) && (
                <button
                  onClick={() => startMut.mutate(t.id)}
                  disabled={startMut.isPending}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl px-4 py-2 disabled:opacity-50"
                >
                  <Play size={14} /> Start Trip
                </button>
              )}
              {['DEPARTED', 'IN_TRANSIT'].includes(t.status) && (
                <>
                  <button
                    onClick={() => sendLocation(t.id)}
                    disabled={pinging === t.id}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-4 py-2 disabled:opacity-50"
                  >
                    <Navigation size={14} /> {pinging === t.id ? 'Sending…' : 'Send GPS'}
                  </button>
                  <button
                    onClick={() => endMut.mutate(t.id)}
                    disabled={endMut.isPending}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl px-4 py-2 disabled:opacity-50"
                  >
                    <Square size={14} /> End Trip
                  </button>
                </>
              )}
              {t.status === 'ARRIVED' && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle size={15} /> Trip completed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
