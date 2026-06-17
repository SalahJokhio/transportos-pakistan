'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints';
import { Bus, Phone, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(phone);
      setSent(true);
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
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your registered phone number and we&apos;ll send an OTP
          </p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h2 className="font-bold text-lg text-gray-800">OTP Sent!</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Check your SMS for a 6-digit code sent to <strong>{phone}</strong>
              </p>
              <button
                onClick={() => router.push(`/auth/reset-password?phone=${encodeURIComponent(phone)}`)}
                className="btn-primary w-full"
              >
                Enter OTP &amp; Reset Password
              </button>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Phone size={14} className="inline mr-1" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="03001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          <div className="mt-4 text-center">
            <Link href="/auth/login" className="text-sm text-slate-500 hover:text-orange-600 flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
