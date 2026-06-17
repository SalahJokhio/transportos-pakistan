'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-500 text-sm mb-6">{error.message}</p>
      <button onClick={reset} className="btn-primary">Try again</button>
    </div>
  );
}
