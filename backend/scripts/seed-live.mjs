// Seed demo data into a running TransportOS via the real API (no DB shortcuts).
// Uses the COMPANY_ADMIN "HR" account so everything is scoped to one company
// and shows up on the operator + staff/HR dashboards.
//   API_BASE=https://backend-production-d926.up.railway.app/api/v1 node scripts/seed-live.mjs
const BASE = process.env.API_BASE || 'https://backend-production-d926.up.railway.app/api/v1';

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function auth({ firstName, lastName, phone, password }) {
  const reg = await api('/auth/register', { method: 'POST', body: { firstName, lastName, phone, password } });
  if (reg.status === 201 || reg.status === 200) return { token: reg.data.accessToken, user: reg.data.user };
  const login = await api('/auth/login', { method: 'POST', body: { phone, password } });
  if (login.status !== 200) throw new Error(`auth failed ${phone}: ${JSON.stringify(login.data)}`);
  return { token: login.data.accessToken, user: login.data.user };
}

function seatLayout(count = 30) {
  const layout = [];
  for (let i = 1; i <= count; i++) {
    const seatNumber = String(i).padStart(2, '0');
    layout.push({ seatNumber, row: Math.ceil(i / 4), col: ((i - 1) % 4) + 1, type: (i % 4 === 1 || i % 4 === 0) ? 'window' : 'aisle' });
  }
  return { rows: Math.ceil(count / 4), seatsPerRow: 4, layout };
}
function dayAt(daysAhead, hour) { const d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(hour, 0, 0, 0); return d; }
const rreg = () => Math.floor(1000 + Math.random() * 9000);

async function main() {
  console.log(`\n=== Seeding demo data -> ${BASE} ===\n`);

  // Operator = the HR / COMPANY_ADMIN account (already promoted).
  const op = await auth({ firstName: 'HR', lastName: 'Manager', phone: '03002223344', password: 'Manager123!' });
  console.log('operator:', op.user.role, op.user.id);

  // --- Staff / HR: employees of many types -------------------------------
  const staff = [
    ['DRIVER', 'Asif', 'Mehmood', 42000, 'Karachi Depot'],
    ['DRIVER', 'Gul', 'Khan', 41000, 'Karachi Depot'],
    ['DRIVER', 'Raheel', 'Ahmed', 43500, 'Lahore Depot'],
    ['CONDUCTOR', 'Bilal', 'Hussain', 28000, 'Karachi Depot'],
    ['CONDUCTOR', 'Naveed', 'Iqbal', 27500, 'Lahore Depot'],
    ['MECHANIC', 'Shakeel', 'Anwar', 35000, 'Workshop'],
    ['ACCOUNTANT', 'Farhan', 'Ali', 55000, 'Head Office'],
    ['BOOKING_AGENT', 'Sana', 'Malik', 30000, 'Karachi Terminal'],
    ['TERMINAL_MANAGER', 'Imran', 'Sheikh', 60000, 'Karachi Terminal'],
    ['SECURITY', 'Waqar', 'Zaman', 25000, 'Karachi Terminal'],
    ['CLEANER', 'Rashid', 'Nawaz', 22000, 'Workshop'],
    ['DISPATCHER', 'Kamran', 'Yousuf', 32000, 'Karachi Depot'],
  ];
  const driverIds = [];
  let n = 0;
  for (const [employeeType, firstName, lastName, salary, depot] of staff) {
    const r = await api('/operator/employees', {
      method: 'POST', token: op.token,
      body: {
        employeeType, firstName, lastName, salary, depot,
        cnic: `42101-${1000000 + Math.floor(Math.random() * 8999999)}-${Math.floor(Math.random() * 9)}`,
        phone: `0300${1000000 + Math.floor(Math.random() * 8999999)}`,
        status: 'ON_DUTY', joinDate: dayAt(-Math.floor(Math.random() * 900), 9).toISOString().slice(0, 10),
      },
    });
    if (r.data?.id) { n++; if (employeeType === 'DRIVER') driverIds.push(r.data.id); }
    else console.log('  emp fail', employeeType, r.status, JSON.stringify(r.data));
  }
  console.log(`employees created: ${n}/${staff.length}`);

  // --- Fleet: routes + buses --------------------------------------------
  const mkRoute = (name, o, d, km, min) => api('/operator/routes', { method: 'POST', token: op.token, body: { name, originCity: o, destinationCity: d, distanceKm: km, estimatedMinutes: min } });
  const r1 = await mkRoute('Karachi → Lahore Express', 'Karachi', 'Lahore', 1210, 1140);
  const r2 = await mkRoute('Karachi → Islamabad Deluxe', 'Karachi', 'Islamabad', 1420, 1320);
  const r3 = await mkRoute('Lahore → Multan', 'Lahore', 'Multan', 340, 300);
  console.log('routes:', [r1, r2, r3].filter((r) => r.data?.id).length, '/3');

  const mkBus = (type, make, model, seats) => api('/operator/buses', { method: 'POST', token: op.token, body: { registrationNumber: `KHI-${rreg()}`, busType: type, make, model, manufacturingYear: 2021 + Math.floor(Math.random() * 4), totalSeats: seats, seatLayout: seatLayout(seats) } });
  const b1 = await mkBus('BUSINESS', 'Yutong', 'ZK6122H9', 30);
  const b2 = await mkBus('AC', 'Higer', 'KLQ6122', 40);
  const b3 = await mkBus('SLEEPER', 'MAN', 'Lion Coach', 24);
  console.log('buses:', [b1, b2, b3].filter((b) => b.data?.id).length, '/3');

  // --- Trips (need a driverId) ------------------------------------------
  const drv = driverIds[0] || op.user.id;
  const mkTrip = (route, bus, days, hour, price) => api('/operator/trips', { method: 'POST', token: op.token, body: { routeId: route.data.id, busId: bus.data.id, driverId: drv, departureTime: dayAt(days, hour).toISOString(), basePrice: price } });
  const trips = [];
  for (const [route, bus, days, hour, price] of [[r1, b1, 1, 8, 4500], [r1, b2, 1, 20, 3800], [r2, b2, 2, 9, 5200], [r3, b3, 1, 14, 2200]]) {
    if (route.data?.id && bus.data?.id) { const t = await mkTrip(route, bus, days, hour, price); if (t.data?.id) trips.push(t.data); else console.log('  trip fail', t.status, JSON.stringify(t.data)); }
  }
  console.log('trips scheduled:', trips.length);

  // --- Bookings: a few passengers book seats ----------------------------
  let booked = 0;
  const pax = [
    { firstName: 'Ali', lastName: 'Khan', phone: '03003334455', password: 'Passenger123!' },
    { firstName: 'Sara', lastName: 'Ahmed', phone: '03004445566', password: 'Passenger123!' },
    { firstName: 'Usman', lastName: 'Riaz', phone: '03005556677', password: 'Passenger123!' },
  ];
  const trip = trips[0];
  if (trip) {
    let seat = 1;
    for (const p of pax) {
      const u = await auth(p);
      const seats = [String(seat).padStart(2, '0'), String(seat + 1).padStart(2, '0')];
      seat += 2;
      await api('/bookings/lock-seats', { method: 'POST', token: u.token, body: { tripId: trip.id, seatNumbers: seats } });
      const bk = await api('/bookings', { method: 'POST', token: u.token, body: { tripId: trip.id, seatNumbers: seats, passengerDetails: seats.map((s) => ({ name: `${p.firstName} ${p.lastName}`, seatNumber: s })) } });
      if (bk.data?.id) {
        const c = await api(`/bookings/${bk.data.id}/confirm`, { method: 'POST', token: u.token, body: { paymentId: `MOCK-${p.phone}` } });
        if (c.data?.status === 'CONFIRMED') booked++;
      } else console.log('  booking fail', bk.status, JSON.stringify(bk.data));
    }
  }
  console.log('confirmed bookings:', booked);
  console.log('\n=== DONE ===\n');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
