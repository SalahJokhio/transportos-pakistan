'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ShieldCheck, Bus, ExternalLink, LogOut } from 'lucide-react';

/**
 * Console shell for the management panels (admin + operator). Deliberately
 * different from the consumer site — dark header, "console" framing — so an
 * admin/operator panel doesn't look like the passenger booking site.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isAdmin = pathname?.includes('/admin');

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            {isAdmin ? (
              <ShieldCheck size={18} className="text-orange-400" />
            ) : (
              <Bus size={18} className="text-orange-400" />
            )}
            <span>
              TransportOS{' '}
              <span className="text-slate-400 font-normal">
                · {isAdmin ? 'Admin Console' : 'Operator Console'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <ExternalLink size={14} /> View site
            </Link>
            {user?.firstName && <span className="text-slate-400 hidden sm:inline">{user.firstName}</span>}
            <button
              onClick={() => {
                logout();
                router.push('/auth/login');
              }}
              className="text-slate-300 hover:text-red-400 flex items-center gap-1.5"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
