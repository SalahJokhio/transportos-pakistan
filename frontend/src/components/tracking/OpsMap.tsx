'use client';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface Bus { tripId: string; lat: number; lng: number; speed?: number }

/** Live ops map: plots every active bus as a marker; re-renders on new data. */
export default function OpsMap({ buses }: { buses: Bus[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mapRef.current) {
        // Centre on Pakistan.
        mapRef.current = L.map(containerRef.current, { center: [30.3753, 69.3451], zoom: 6 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapRef.current);
      }

      // Redraw markers.
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const busIcon = L.divIcon({
        html: '<div style="background:#F97316;color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.4)">🚌</div>',
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      });
      const pts: [number, number][] = [];
      for (const b of buses) {
        if (b.lat == null || b.lng == null) continue;
        const m = L.marker([b.lat, b.lng], { icon: busIcon })
          .addTo(mapRef.current!)
          .bindPopup(`Trip ${b.tripId.slice(0, 8)}<br/>${b.speed ? Math.round(b.speed) + ' km/h' : ''}`);
        markersRef.current.push(m);
        pts.push([b.lat, b.lng]);
      }
      if (pts.length) mapRef.current!.fitBounds(pts as any, { padding: [40, 40], maxZoom: 12 });
    });
    return () => { cancelled = true; };
  }, [buses]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return <div ref={containerRef} className="w-full h-[70vh] rounded-xl overflow-hidden border" />;
}
