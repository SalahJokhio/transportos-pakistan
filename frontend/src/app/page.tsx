'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Bus, Shield, Clock, Ticket } from 'lucide-react';

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot',
  'Gujranwala', 'Bahawalpur', 'Sukkur', 'Abbottabad', 'Murree',
];

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState({ from: '', to: '', date: '', passengers: '1' });

  const today = new Date().toISOString().split('T')[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to || !form.date) return;
    const params = new URLSearchParams({
      originCity: form.from,
      destinationCity: form.to,
      date: form.date,
      passengers: form.passengers,
    });
    router.push(`/search?${params}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-orange-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
            <Bus size={14} /> Pakistan's #1 Online Bus Booking Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Book Bus Tickets<br />
            <span className="text-orange-300">Anywhere in Pakistan</span>
          </h1>
          <p className="text-lg text-green-100 mb-10">
            Real-time seat availability · Live tracking · Instant confirmation
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl text-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <select
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className="input pl-9"
                  required
                >
                  <option value="">From City</option>
                  {PAKISTAN_CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-orange-500" />
                <select
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  className="input pl-9"
                  required
                >
                  <option value="">To City</option>
                  {PAKISTAN_CITIES.filter((c) => c !== form.from).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="date"
                  min={today}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="input pl-9"
                  required
                />
              </div>

              <button type="submit" className="btn-primary flex items-center justify-center gap-2">
                <Search size={16} /> Search Buses
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: <Clock size={28} />, title: 'Live Bus Tracking', desc: 'Track your bus in real-time on the map. Know exactly where it is.' },
          { icon: <Shield size={28} />, title: 'Secure Payments', desc: 'Pay via JazzCash, EasyPaisa, or bank card. 100% secure.' },
          { icon: <Ticket size={28} />, title: 'Instant Confirmation', desc: 'Get your PNR instantly via SMS. No waiting, no queues.' },
        ].map((f) => (
          <div key={f.title} className="card text-center">
            <div className="text-orange-600 flex justify-center mb-4">{f.icon}</div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-slate-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Popular Routes */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Popular Routes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { from: 'Lahore', to: 'Karachi', time: '18 hrs' },
              { from: 'Islamabad', to: 'Lahore', time: '5 hrs' },
              { from: 'Karachi', to: 'Hyderabad', time: '3 hrs' },
              { from: 'Peshawar', to: 'Islamabad', time: '3 hrs' },
              { from: 'Multan', to: 'Lahore', time: '6 hrs' },
              { from: 'Lahore', to: 'Faisalabad', time: '3 hrs' },
              { from: 'Karachi', to: 'Quetta', time: '14 hrs' },
              { from: 'Islamabad', to: 'Peshawar', time: '3 hrs' },
            ].map((r) => (
              <button
                key={`${r.from}-${r.to}`}
                onClick={() => {
                  const params = new URLSearchParams({ originCity: r.from, destinationCity: r.to, date: today });
                  router.push(`/search?${params}`);
                }}
                className="border border-slate-100 hover:border-orange-300 rounded-xl p-4 text-left transition-all hover:shadow-md group"
              >
                <div className="text-sm font-semibold group-hover:text-orange-600">{r.from} → {r.to}</div>
                <div className="text-xs text-slate-400 mt-1">{r.time}</div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
