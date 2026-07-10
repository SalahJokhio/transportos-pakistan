// Seed + end-to-end booking flow + concurrency probe.
// Drives the real API (no DB shortcuts) so it doubles as an integration test.
//   node scripts/seed-e2e.mjs
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
};

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

// Register, or log in if the phone is already taken.
async function authUser({ firstName, lastName, phone, password, role }) {
  const reg = await api('/auth/register', {
    method: 'POST',
    body: { firstName, lastName, phone, password, role },
  });
  if (reg.status === 201 || reg.status === 200) {
    return { token: reg.data.accessToken, user: reg.data.user };
  }
  const login = await api('/auth/login', { method: 'POST', body: { phone, password } });
  if (login.status !== 200) {
    throw new Error(`auth failed for ${phone}: register ${reg.status} ${JSON.stringify(reg.data)}, login ${login.status} ${JSON.stringify(login.data)}`);
  }
  return { token: login.data.accessToken, user: login.data.user };
}

function buildSeatLayout(count = 20) {
  const layout = [];
  for (let i = 1; i <= count; i++) {
    const seatNumber = String(i).padStart(2, '0');
    layout.push({
      seatNumber,
      row: Math.ceil(i / 4),
      col: ((i - 1) % 4) + 1,
      type: (i % 4 === 1 || i % 4 === 0) ? 'window' : 'aisle',
    });
  }
  return { rows: Math.ceil(count / 4), seatsPerRow: 4, layout };
}

function tomorrowAt(hour = 8) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log(`\n=== TransportOS seed + E2E (${BASE}) ===\n`);

  // 1. Operator + fleet ---------------------------------------------------
  console.log('[1] Operator onboarding');
  const operator = await authUser({
    firstName: 'Daewoo', lastName: 'Express', phone: '03009990001',
    password: 'Operator123!', role: 'COMPANY_ADMIN',
  });
  ok(!!operator.token, 'operator authenticated');

  const route = await api('/operator/routes', {
    method: 'POST', token: operator.token,
    body: {
      name: 'Karachi - Lahore Express',
      originCity: 'Karachi', destinationCity: 'Lahore',
      distanceKm: 1210, estimatedMinutes: 1140,
    },
  });
  ok(route.status < 300 && route.data?.id, `route created (${route.data?.id})`);

  const bus = await api('/operator/buses', {
    method: 'POST', token: operator.token,
    body: {
      registrationNumber: `KHI-${Math.floor(1000 + Math.random() * 9000)}`,
      busType: 'BUSINESS', make: 'Yutong', model: 'ZK6122H9',
      manufacturingYear: 2022, totalSeats: 20, seatLayout: buildSeatLayout(20),
    },
  });
  ok(bus.status < 300 && bus.data?.id, `bus created (${bus.data?.id})`);

  const departure = tomorrowAt(8);
  const trip = await api('/operator/trips', {
    method: 'POST', token: operator.token,
    body: {
      routeId: route.data.id, busId: bus.data.id, driverId: operator.user.id,
      departureTime: departure.toISOString(), basePrice: 4500,
    },
  });
  ok(trip.status < 300 && trip.data?.id, `trip scheduled (${trip.data?.id})`);
  const tripId = trip.data.id;

  // 2. Passenger search ---------------------------------------------------
  console.log('\n[2] Passenger search');
  const passenger = await authUser({
    firstName: 'Ali', lastName: 'Ahmed', phone: '03007770001',
    password: 'Passenger123!', role: 'PASSENGER',
  });
  ok(!!passenger.token, 'passenger authenticated');

  const dateStr = departure.toISOString().slice(0, 10);
  const search = await api(`/trips/search?originCity=Karachi&destinationCity=Lahore&date=${dateStr}`);
  const found = Array.isArray(search.data) && search.data.find((t) => t.id === tripId);
  ok(!!found, `search returns our trip (availableSeats=${found?.availableSeats})`);

  const seatMap = await api(`/trips/${tripId}/seats`);
  ok(seatMap.data?.seatAvailability?.['01'] === 'AVAILABLE', 'seat 01 available in seat map');

  // 3. Happy-path booking -------------------------------------------------
  console.log('\n[3] Happy-path booking (seat 01)');
  const lock = await api('/bookings/lock-seats', {
    method: 'POST', token: passenger.token, body: { tripId, seatNumbers: ['01'] },
  });
  ok(lock.data?.success === true, 'seat 01 locked');

  const booking = await api('/bookings', {
    method: 'POST', token: passenger.token,
    body: { tripId, seatNumbers: ['01'], passengerDetails: [{ name: 'Ali Ahmed', seatNumber: '01' }] },
  });
  ok(booking.status < 300 && booking.data?.pnr, `booking created (PNR ${booking.data?.pnr})`);

  const confirm = await api(`/bookings/${booking.data.id}/confirm`, {
    method: 'POST', token: passenger.token, body: { paymentId: 'MOCK-PAY-001' },
  });
  ok(confirm.data?.status === 'CONFIRMED', 'booking confirmed');

  const seatMap2 = await api(`/trips/${tripId}/seats`);
  ok(seatMap2.data?.seatAvailability?.['01'] === 'BOOKED', 'seat 01 now BOOKED in trip');

  // 4. CONCURRENCY PROBE: two passengers race for seat 05 -----------------
  console.log('\n[4] Concurrency probe: two passengers race for seat 05');
  const racerA = await authUser({
    firstName: 'Racer', lastName: 'A', phone: '03007770002', password: 'Passenger123!', role: 'PASSENGER',
  });
  const racerB = await authUser({
    firstName: 'Racer', lastName: 'B', phone: '03007770003', password: 'Passenger123!', role: 'PASSENGER',
  });

  // Both lock, both book, both confirm — as concurrently as we can.
  const race = async (racer, label) => {
    const l = await api('/bookings/lock-seats', { method: 'POST', token: racer.token, body: { tripId, seatNumbers: ['05'] } });
    const b = await api('/bookings', {
      method: 'POST', token: racer.token,
      body: { tripId, seatNumbers: ['05'], passengerDetails: [{ name: label, seatNumber: '05' }] },
    });
    let confirmed = false;
    if (b.data?.id) {
      const c = await api(`/bookings/${b.data.id}/confirm`, { method: 'POST', token: racer.token, body: { paymentId: `MOCK-${label}` } });
      confirmed = c.data?.status === 'CONFIRMED';
    }
    return { label, locked: l.data?.success, bookingId: b.data?.id, confirmed };
  };

  const [ra, rb] = await Promise.all([race(racerA, 'A'), race(racerB, 'B')]);
  await sleep(200);

  // Ground truth: how many CONFIRMED bookings exist for seat 05?
  const aBk = ra.bookingId ? await api(`/bookings/${ra.bookingId}`) : { data: {} };
  const bBk = rb.bookingId ? await api(`/bookings/${rb.bookingId}`) : { data: {} };
  const confirmedCount = [aBk.data?.status, bBk.data?.status].filter((s) => s === 'CONFIRMED').length;

  console.log(`    racerA: locked=${ra.locked} confirmed=${aBk.data?.status}`);
  console.log(`    racerB: locked=${rb.locked} confirmed=${bBk.data?.status}`);
  ok(confirmedCount === 1, `EXACTLY ONE confirmed booking for seat 05 (got ${confirmedCount}) — the one thing that can't break`);

  // Summary ---------------------------------------------------------------
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
