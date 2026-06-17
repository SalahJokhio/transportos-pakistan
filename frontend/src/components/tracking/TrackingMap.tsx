'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

interface BusLocation {
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

interface TrackingMapProps {
  initialLat?: number;
  initialLng?: number;
  busLocation: BusLocation | null;
  fromCity?: string;
  toCity?: string;
}

// Pakistan center
const PAKISTAN_CENTER: [number, number] = [30.3753, 69.3451];
const DEFAULT_ZOOM = 6;
const BUS_ZOOM = 13;

export function TrackingMap({ initialLat, initialLng, busLocation, fromCity, toCity }: TrackingMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default marker icon paths (Leaflet webpack issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const center: [number, number] = initialLat && initialLng
        ? [initialLat, initialLng]
        : PAKISTAN_CENTER;

      const map = L.map(containerRef.current!, {
        center,
        zoom: initialLat ? BUS_ZOOM : DEFAULT_ZOOM,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom bus icon (orange circle)
      const busIcon = L.divIcon({
        html: `<div style="
          width: 36px; height: 36px;
          background: #f97316;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        ">🚌</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: '',
      });

      if (initialLat && initialLng) {
        markerRef.current = L.marker([initialLat, initialLng], { icon: busIcon })
          .addTo(map)
          .bindPopup(`<b>Bus in transit</b><br>${fromCity || ''} → ${toCity || ''}`)
          .openPopup();
      }

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  // Update marker position when new GPS data arrives
  useEffect(() => {
    if (!busLocation || !mapRef.current) return;

    import('leaflet').then((L) => {
      const { lat, lng } = busLocation;
      const latlng = L.latLng(lat, lng);

      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        const busIcon = L.divIcon({
          html: `<div style="
            width: 36px; height: 36px;
            background: #f97316;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
          ">🚌</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          className: '',
        });
        markerRef.current = L.marker(latlng, { icon: busIcon })
          .addTo(mapRef.current!)
          .bindPopup(`<b>Bus in transit</b><br>${fromCity || ''} → ${toCity || ''}`);
      }

      mapRef.current!.setView(latlng, Math.max(mapRef.current!.getZoom(), BUS_ZOOM), { animate: true });
    });
  }, [busLocation]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
