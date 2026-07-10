'use client';
import { useState } from 'react';
import { driverApi } from '@/lib/api/endpoints';
import { Search, Star, ShieldCheck, Route, Gauge, Award, User } from 'lucide-react';

export default function VerifyDriverPage() {
  const [cnic, setCnic] = useState('');
  const [rec, setRec] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setError('');
    setRec(null);
    if (!cnic.trim()) return;
    setLoading(true);
    try {
      const res = await driverApi.verifyByCnic(cnic.trim());
      setRec(res);
    } catch (e: any) {
      setError(e?.response?.status === 404 ? 'No driver found for this CNIC.' : 'Could not verify. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const experience = (m: number) => {
    if (!m || m < 1) return 'New';
    if (m < 12) return `${m} mo`;
    const y = Math.floor(m / 12);
    return `${y} yr${m % 12 ? ` ${m % 12} mo` : ''}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 mb-3">
          <ShieldCheck size={30} />
        </div>
        <h1 className="text-2xl font-bold">Verify a driver</h1>
        <p className="text-slate-500 text-sm mt-1">
          Check a driver&apos;s full record by CNIC before hiring — trips, experience and reviews follow the driver.
        </p>
      </div>

      {/* Search */}
      <div className="card flex gap-2">
        <input
          className="input flex-1"
          placeholder="Enter CNIC e.g. 42101-1234567-1"
          value={cnic}
          onChange={(e) => setCnic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && verify()}
        />
        <button onClick={verify} disabled={loading} className="btn-primary flex items-center gap-2 px-5 disabled:opacity-50">
          <Search size={16} /> {loading ? 'Checking…' : 'Verify'}
        </button>
      </div>

      {error && <div className="card mt-4 text-center text-red-500 py-6">{error}</div>}

      {rec && (
        <div className="mt-6 space-y-4">
          {/* Identity */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <User size={34} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{rec.name || 'Driver'}</h2>
                  {rec.isVerified && <ShieldCheck size={18} className="text-green-600" />}
                </div>
                <p className="text-slate-500 text-sm font-mono">CNIC {rec.cnic || '—'}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Star size={20} className="text-amber-400 fill-amber-400" />
                  <span className="text-2xl font-bold">{rec.rating?.average ?? '—'}</span>
                </div>
                <p className="text-xs text-slate-400">{rec.rating?.count ?? 0} reviews</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              [<Route size={20} key="r" />, rec.stats?.completedTrips ?? 0, 'Trips done'],
              [<Gauge size={20} key="g" />, (rec.stats?.totalKm ?? 0).toLocaleString(), 'km driven'],
              [<Award size={20} key="a" />, experience(rec.experienceMonths), 'Experience'],
            ].map(([icon, val, label]: any, i) => (
              <div key={i} className="card text-center py-5">
                <div className="text-orange-500 flex justify-center mb-2">{icon}</div>
                <div className="text-lg font-bold">{val}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Routes */}
          {rec.stats?.routesDriven?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">Routes driven</h3>
              <div className="flex flex-wrap gap-2">
                {rec.stats.routesDriven.map((r: string, i: number) => (
                  <span key={i} className="text-xs bg-slate-100 rounded-full px-3 py-1.5 text-slate-700">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="card">
            <h3 className="font-semibold mb-3">Remarks ({rec.recentReviews?.length ?? 0})</h3>
            {(!rec.recentReviews || rec.recentReviews.length === 0) ? (
              <p className="text-slate-400 text-sm">No remarks yet.</p>
            ) : (
              <div className="space-y-3">
                {rec.recentReviews.map((rv: any, i: number) => (
                  <div key={i} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{rv.by || 'Anonymous'}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} size={13} className={s < rv.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                        ))}
                      </div>
                    </div>
                    {rv.remark && <p className="text-sm text-slate-500 mt-1">{rv.remark}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
