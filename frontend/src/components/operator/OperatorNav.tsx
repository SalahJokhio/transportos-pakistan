'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, FileText, Users, Contact, BarChart3 } from 'lucide-react';

const LINKS = [
  { href: '/dashboard/operator', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/staff', label: 'Staff & HR', icon: Contact },
  { href: '/dashboard/drivers', label: 'Drivers', icon: Users },
  { href: '/dashboard/finance', label: 'Finance', icon: TrendingUp },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
];

export function OperatorNav() {
  const pathname = usePathname();
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6">
      <div className="flex gap-2 overflow-x-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              <Icon size={15} /> {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
