'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { MapPin, Clock, Wifi, WifiOff, AlertCircle, Bus, Navigation } from 'lucide-react';

// Load the map only on the client (Leaflet requires window)
const TrackingMap = dynamic(
  () => import('@/components/tracking/TrackingMap').then((m) => m.TrackingMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

interface BusLocation {
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
      <div className="text-center text-gray-400">
        <MapPin className="mx-auto mb-2 h-8 w-8 animate-pulse" />
        <p className="text-sm">Loading map…</p>
      </div>
    </div>
  );
}

function StatusBadge({ connected, lastUpdate }: { connected: boolean; lastUpdate: Date | null }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {connected ? 'Live' : 'Disconnected'}
      {lastUpdate && (
        <span className="text-xs opacity-70 ml-1">
          {new Date(lastUpdate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
}

export default function TrackTripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // Fetch trip details for display
  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => api.get(`/fleet/trips/${tripId}`).then((r) => r.data),
    enabled: !!tripId,
    retry: 1,
  });

  // Poll REST endpoint once to get cached location before WS fires
  const { data: restLocation } = useQuery({
    queryKey: ['trip-location', tripId],
    queryFn: () =>
      api.get(`/tracking/${tripId}/location`).then((r) => r.data),
    enabled: !!tripId,
    refetchInterval: 15000, // fallback poll every 15s
    retry: 1,
  });

  // Apply REST-polled location if no WS location yet
  useEffect(() => {
    if (restLocation?.lat && !busLocation) {
      setBusLocation({
        tripId,
        lat: restLocation.lat,
        lng: restLocation.lng,
        speed: restLocation.speed,
        timestamp: restLocation.updatedAt ? new Date(restLocation.updatedAt) : new Date(),
      });
    }
  }, [restLocation, tripId]);

  // Socket.io connection
  useEffect(() => {
    if (!tripId) return;

    let socket: ReturnType<typeof import('socket.io-client').io> | null = null;

    const trackingUrl =
      process.env.NEXT_PUBLIC_TRACKING_URL || 'http://localhost:3005';

    import('socket.io-client').then(({ io }) => {
      socket = io(`${trackingUrl}/tracking`, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        setConnected(true);
        setSocketError(null);
        socket!.emit('track:trip', { tripId });
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('connect_error', (err: Error) => {
        setConnected(false);
        setSocketError(err.message);
      });

      socket.on('bus:location', (data: BusLocation) => {
        setBusLocation({ ...data, timestamp: new Date(data.timestamp) });
      });
    });

    return () => {
      socket?.disconnect();
    };
  }, [tripId]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-700',
      BOARDING: 'bg-yellow-100 text-yellow-700',
      DEPARTED: 'bg-orange-100 text-orange-700',
      IN_TRANSIT: 'bg-green-100 text-green-700',
      ARRIVED: 'bg-gray-100 text-gray-600',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Bus className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {trip ? `${trip.route?.originCity || '—'} → ${trip.route?.destinationCity || '—'}` : 'Live Bus Tracking'}
                </h1>
                {trip && (
                  <p className="text-sm text-gray-500">
                    {formatDate(trip.departureTime)} · Dep {formatTime(trip.departureTime)} · Arr {formatTime(trip.estimatedArrivalTime)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {trip?.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(trip.status)}`}>
                  {trip.status}
                </span>
              )}
              <StatusBadge connected={connected} lastUpdate={busLocation?.timestamp ?? null} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Socket connection error banner */}
        {socketError && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Could not connect to live tracking ({socketError}). Showing cached GPS data.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map — takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ height: '500px' }}>
              <TrackingMap
                busLocation={busLocation}
                initialLat={busLocation?.lat}
                initialLng={busLocation?.lng}
                fromCity={trip?.route?.originCity}
                toCity={trip?.route?.destinationCity}
              />
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            {/* GPS info card */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-orange-500" />
                GPS Data
              </h2>
              {busLocation ? (
                <div className="space-y-2 text-sm">
                  <Row label="Latitude" value={busLocation.lat.toFixed(6)} />
                  <Row label="Longitude" value={busLocation.lng.toFixed(6)} />
                  {busLocation.speed !== undefined && (
                    <Row label="Speed" value={`${Math.round(busLocation.speed)} km/h`} />
                  )}
                  <Row
                    label="Updated"
                    value={new Date(busLocation.timestamp).toLocaleTimeString('en-PK')}
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Waiting for GPS signal…</p>
                  <p className="text-xs mt-1">Driver app must be active</p>
                </div>
              )}
            </div>

            {/* Trip details card */}
            {trip && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Trip Details
                </h2>
                <div className="space-y-2 text-sm">
                  <Row label="Route" value={trip.route?.name || '—'} />
                  <Row label="Bus" value={trip.bus?.registrationNumber || '—'} />
                  {trip.bus?.model && <Row label="Model" value={trip.bus.model} />}
                  <Row label="Departure" value={formatTime(trip.departureTime)} />
                  <Row label="Arrival (Est)" value={formatTime(trip.estimatedArrivalTime)} />
                  <Row label="Seats Available" value={String(trip.availableSeats ?? '—')} />
                </div>
              </div>
            )}

            {/* Help box */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs text-orange-700 font-medium mb-1">Tracking Info</p>
              <p className="text-xs text-orange-600">
                Location updates every 10 seconds from the driver&apos;s mobile app.
                If the bus is stationary, the marker won&apos;t move.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
