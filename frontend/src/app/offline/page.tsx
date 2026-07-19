import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <div>
        <div className="flex justify-center text-slate-400 mb-4"><WifiOff size={48} /></div>
        <h1 className="text-xl font-bold">You’re offline</h1>
        <p className="text-slate-500 text-sm mt-2 max-w-xs">
          No internet right now. Cached pages still work; new bookings and payments will
          sync when you’re back online.
        </p>
      </div>
    </div>
  );
}
