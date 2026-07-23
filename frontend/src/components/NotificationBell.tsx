'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxApi } from '@/lib/api/admin';
import { useAuthStore } from '@/store/auth.store';
import { Bell } from 'lucide-react';

const TYPE_DOT: Record<string, string> = { success: 'bg-green-500', warning: 'bg-amber-500', payment: 'bg-indigo-500', booking: 'bg-orange-500', trip: 'bg-blue-500', info: 'bg-slate-400' };

/** In-app notification bell — unread badge + dropdown. */
export function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ['inbox-unread'], queryFn: inboxApi.unreadCount,
    enabled: isAuthenticated, refetchInterval: 30000,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['inbox-list'], queryFn: inboxApi.list, enabled: isAuthenticated && open,
  });
  const readAll = useMutation({ mutationFn: () => inboxApi.markAllRead(), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inbox-unread'] }); qc.invalidateQueries({ queryKey: ['inbox-list'] }); } });

  if (!isAuthenticated) return null;
  const count = (unread as any)?.unread ?? 0;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative p-2 text-slate-500 hover:text-slate-800" aria-label="Notifications">
        <Bell size={18} />
        {count > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-800">Notifications</span>
              {count > 0 && <button onClick={() => readAll.mutate()} className="text-xs text-orange-600">Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y">
              {(items as any[]).length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">No notifications.</div>}
              {(items as any[]).map((n) => (
                <div key={n.id} className={`px-4 py-2.5 ${n.isRead ? 'opacity-60' : 'bg-orange-50/30'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[n.type] ?? TYPE_DOT.info}`} />
                    <span className="text-sm font-medium text-slate-800">{n.title}</span>
                  </div>
                  {n.body && <div className="text-xs text-slate-500 mt-0.5 ml-3.5">{n.body}</div>}
                  <div className="text-[10px] text-slate-400 mt-0.5 ml-3.5">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
