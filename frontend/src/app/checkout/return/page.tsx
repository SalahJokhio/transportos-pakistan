'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, RotateCcw, Home } from 'lucide-react';

/**
 * Where the payment gateway sends the passenger back on a FAILED payment
 * (success goes straight to /booking/[pnr]). Gives a clear retry path so a
 * dropped/declined payment doesn't dead-end the booking.
 */
export default function CheckoutReturnPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get('status') || 'failed';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center p-8">
        <div className="flex justify-center text-red-500 mb-4"><XCircle size={48} /></div>
        <h1 className="text-xl font-bold mb-2">Payment {status === 'failed' ? 'was not completed' : status}</h1>
        <p className="text-slate-500 text-sm mb-6">
          Your booking is held for a few minutes. You can try paying again, or use a
          different method. If money was deducted, it will be reversed automatically.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => router.back()} className="btn-primary flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Try again
          </button>
          <button onClick={() => router.push('/')} className="text-slate-500 text-sm flex items-center justify-center gap-1 hover:text-orange-600">
            <Home size={14} /> Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
