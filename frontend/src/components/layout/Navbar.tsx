'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Bus, MapPin, Ticket, Star, User, LogOut, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Consumer navbar is only for the passenger-facing site. Admin/operator use
  // the dark console shell; agent & driver have their own focused headers.
  if (
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/agent') ||
    pathname?.startsWith('/driver')
  ) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-orange-600">
          <Bus size={24} />
          <span>TransportOS</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/search" className="hover:text-orange-600 flex items-center gap-1">
            <MapPin size={15} /> Search Buses
          </Link>
          <Link href="/verify-driver" className="hover:text-orange-600 flex items-center gap-1">
            <ShieldCheck size={15} /> Verify Driver
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/my-bookings" className="hover:text-orange-600 flex items-center gap-1">
                <Ticket size={15} /> My Bookings
              </Link>
              <Link href="/wallet" className="hover:text-orange-600 flex items-center gap-1">
                <Star size={15} /> Wallet
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-sm text-slate-600 hidden md:flex items-center gap-1 hover:text-orange-600">
                <User size={15} /> {user?.firstName}
              </Link>
              <button onClick={logout} className="text-slate-400 hover:text-red-500 transition">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-orange-600 px-3 py-2">
                Login
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
