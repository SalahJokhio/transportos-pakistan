import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-5xl font-bold text-slate-200 mb-4">404</h2>
      <p className="text-slate-500 mb-6">Page not found</p>
      <Link href="/" className="btn-primary">Go Home</Link>
    </div>
  );
}
