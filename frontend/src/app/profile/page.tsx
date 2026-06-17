'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { loyaltyApi } from '@/lib/api/loyalty';
import { formatCnicInput, isCnicValid } from '@/lib/cnic';
import { User, Star, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    cnic: user?.cnic || '',
  });
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password form
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  const { data: balance } = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: loyaltyApi.getBalance,
  });

  const profileMut = useMutation({
    mutationFn: (data: any) => api.put('/users/profile', data) as unknown as Promise<any>,
    onSuccess: (data: any) => {
      updateUser(data);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err: any) => setProfileError(err.message),
  });

  const passMut = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => {
      setPassSuccess(true);
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPassSuccess(false), 3000);
    },
    onError: (err: any) => setPassError(err.message),
  });

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    if (profile.cnic && !isCnicValid(profile.cnic)) {
      setProfileError('Invalid CNIC format');
      return;
    }
    profileMut.mutate(profile);
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (passwords.newPassword !== passwords.confirm) { setPassError('Passwords do not match'); return; }
    if (passwords.newPassword.length < 8) { setPassError('Password must be at least 8 characters'); return; }
    passMut.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
  };

  const ROLE_LABEL: Record<string, string> = {
    PASSENGER: 'Passenger',
    BOOKING_AGENT: 'Booking Agent',
    COMPANY_ADMIN: 'Operator',
    DRIVER: 'Driver',
    SUPER_ADMIN: 'Super Admin',
    FLEET_MANAGER: 'Fleet Manager',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {user?.firstName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
              <div className="text-orange-200 text-sm">{ROLE_LABEL[user?.role || ''] || user?.role}</div>
              <div className="flex items-center gap-1.5 mt-1 text-sm">
                <Star className="h-4 w-4 text-yellow-300" />
                <span>{balance?.points?.toLocaleString() ?? '0'} loyalty points</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-5">

        {/* Profile info card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-orange-500" /> Personal Information
          </h2>

          {profileSuccess && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-3 py-2 text-sm mb-4">
              <CheckCircle className="h-4 w-4" /> Profile updated successfully
            </div>
          )}
          {profileError && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 rounded-lg px-3 py-2 text-sm mb-4">
              <AlertCircle className="h-4 w-4" /> {profileError}
            </div>
          )}

          <form onSubmit={handleProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                <input
                  className="input"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  placeholder="Ali"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                <input
                  className="input"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  placeholder="Ahmed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <input
                type="email"
                className="input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="ali@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input
                className="input bg-gray-50 cursor-not-allowed"
                value={user?.phone || ''}
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CNIC</label>
              <input
                className={`input ${profile.cnic && !isCnicValid(profile.cnic) ? 'border-red-300' : ''}`}
                value={profile.cnic}
                onChange={(e) => setProfile({ ...profile, cnic: formatCnicInput(e.target.value) })}
                placeholder="35202-1234567-1"
                maxLength={15}
              />
              {profile.cnic && !isCnicValid(profile.cnic) && (
                <p className="text-xs text-red-500 mt-1">Enter 13-digit CNIC</p>
              )}
            </div>

            <button
              type="submit"
              disabled={profileMut.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {profileMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change password card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-500" /> Change Password
          </h2>

          {passSuccess && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-3 py-2 text-sm mb-4">
              <CheckCircle className="h-4 w-4" /> Password changed successfully
            </div>
          )}
          {passError && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 rounded-lg px-3 py-2 text-sm mb-4">
              <AlertCircle className="h-4 w-4" /> {passError}
            </div>
          )}

          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <input
                type="password"
                className="input"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                className={`input ${passwords.confirm && passwords.confirm !== passwords.newPassword ? 'border-red-300' : ''}`}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={passMut.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {passMut.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Account Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Account ID</span>
              <span className="font-mono text-xs text-gray-600">{user?.id?.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Role</span>
              <span className="font-medium">{ROLE_LABEL[user?.role || ''] || user?.role}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Loyalty Points</span>
              <span className="font-medium text-orange-600">{balance?.points?.toLocaleString() ?? 0} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
