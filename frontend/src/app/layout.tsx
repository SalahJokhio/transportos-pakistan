import type { Metadata } from 'next';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';
import { ChatWidget } from '@/components/ChatWidget';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'TransportOS — Pakistan Bus Booking',
  description: 'Book bus tickets online across Pakistan. Live tracking, instant confirmation.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#F97316',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <ChatWidget />
          <ServiceWorkerRegistrar />
        </Providers>
      </body>
    </html>
  );
}
