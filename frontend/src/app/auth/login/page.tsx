'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/endpoints';
import { roleHome } from '@/lib/roleHome';
import { Bus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res: any = await authApi.login(form);
      setAuth(res.user, res.accessToken, res.refreshToken);
      // Send staff/admin roles straight to their console; passengers to home.
      router.push(roleHome(res.user?.role));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center text-orange-600 mb-3"><Bus size={36} /></div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1">Login to your TransportOS account</p>
        </div>

        <div className="card">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="03001234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
            <Link href="/auth/forgot-password" className="text-orange-600 hover:underline">Forgot password?</Link>
            <span>
              No account?{' '}
              <Link href="/auth/register" className="text-orange-600 font-medium hover:underline">Sign up</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
