'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/endpoints';
import { Bus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res: any = await authApi.register(form);
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input" required={key !== 'email'} />
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center text-orange-600 mb-3"><Bus size={36} /></div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join TransportOS today</p>
        </div>
        <div className="card">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field('firstName', 'First Name', 'text', 'Ali')}
              {field('lastName', 'Last Name', 'text', 'Ahmed')}
            </div>
            {field('phone', 'Phone Number', 'tel', '03001234567')}
            {field('email', 'Email (optional)', 'email', 'ali@example.com')}
            {field('password', 'Password', 'password', 'Min 8 characters')}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-orange-600 font-medium hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
