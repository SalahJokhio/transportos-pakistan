'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints';
import { Bus, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const phoneParam = sp.get('phone') || '';

  const [form, setForm] = useState({ phone: phoneParam, otp: '', newPassword: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      await authApi.resetPassword({ phone: form.phone, otp: form.otp, newPassword: form.newPassword });
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Password Reset!</h1>
          <p className="text-gray-500 mt-2 mb-6">Your password has been updated. Please login with your new password.</p>
          <button onClick={() => router.push('/auth/login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center text-orange-600 mb-3"><Bus size={36} /></div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-slate-500 text-sm mt-1">Enter the OTP sent to your phone and choose a new password</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">OTP Code</label>
              <input
                type="text"
                placeholder="6-digit OTP"
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="input tracking-widest text-center text-xl font-mono"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className={`input ${form.confirm && form.confirm !== form.newPassword ? 'border-red-300' : ''}`}
                required
              />
              {form.confirm && form.confirm !== form.newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-slate-500 hover:text-orange-600">
              Didn&apos;t receive OTP? Try again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
