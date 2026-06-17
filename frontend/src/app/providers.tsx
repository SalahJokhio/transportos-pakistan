'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

function AuthEventListener() {
  const { setAccessToken, logout } = useAuthStore();

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const { accessToken } = (e as CustomEvent).detail;
      setAccessToken(accessToken);
    };
    const onLogout = () => logout();

    window.addEventListener('auth:token-refreshed', onRefresh);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      window.removeEventListener('auth:token-refreshed', onRefresh);
      window.removeEventListener('auth:logout', onLogout);
    };
  }, [setAccessToken, logout]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthEventListener />
      {children}
    </QueryClientProvider>
  );
}
