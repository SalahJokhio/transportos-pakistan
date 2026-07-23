import { api } from './client';

const get = (url: string, config?: any): Promise<any> => api.get(url, config) as unknown as Promise<any>;
const post = (url: string, data?: any): Promise<any> => api.post(url, data) as unknown as Promise<any>;
const del = (url: string, config?: any): Promise<any> => api.delete(url, config) as unknown as Promise<any>;

export const authApi = {
  register: (data: any) => post('/auth/register', data),
  login: (data: any) => post('/auth/login', data),
  refresh: (refreshToken: string) => post('/auth/refresh', { refreshToken }),
  forgotPassword: (phone: string) => post('/auth/forgot-password', { phone }),
  resetPassword: (data: { phone: string; otp: string; newPassword: string }) => post('/auth/reset-password', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
  sendOtp: (data: any) => post('/auth/otp/send', data),
  verifyOtp: (data: any) => post('/auth/otp/verify', data),
  me: () => get('/auth/me'),
};

export const tripApi = {
  search: (params: { originCity: string; destinationCity: string; date: string; passengers?: number; transportType?: string }) =>
    get('/trips/search', { params }),
  getById: (id: string) => get(`/trips/${id}`),
  // Lock-aware seat map: AVAILABLE / LOCKED (held by someone else) / BOOKED
  getSeatMap: (id: string) => get(`/bookings/seat-map/${id}`),
};

export const routeApi = {
  getCities: () => get('/routes/cities'),
  getAll: () => get('/routes'),
};

export const bookingApi = {
  lockSeats: (data: { tripId: string; seatNumbers: string[] }) => post('/bookings/lock-seats', data),
  create: (data: any) => post('/bookings', data),
  getMyBookings: () => get('/bookings/my-bookings'),
  getByPnr: (pnr: string) => get(`/bookings/pnr/${pnr}`),
  getTicket: (pnr: string) => get(`/bookings/ticket/${pnr}`), // full e-ticket + QR
  cancel: (id: string, reason: string) => del(`/bookings/${id}/cancel`, { data: { reason } }),
};

export const paymentApi = {
  // amount is derived server-side from the booking (can't be tampered).
  // Returns { live, mode, postUrl, fields, ... }: live=true means redirect to the
  // real gateway; live=false means use mockConfirm (sandbox).
  initiate: (data: { bookingId: string; method: 'jazzcash' | 'easypaisa' }) =>
    post('/payments/initiate', data),
  // DEV/sandbox: simulate a successful payment and confirm the booking
  mockConfirm: (bookingId: string) => post('/payments/mock-confirm', { bookingId }),
  // Pay for a booking from the wallet balance
  payWithWallet: (bookingId: string) => post('/payments/wallet', { bookingId }),
  status: (paymentId: string) => get(`/payments/${paymentId}/status`),
  refund: (paymentId: string, data: { amount?: number; reason?: string } = {}) =>
    post(`/payments/${paymentId}/refund`, data),
};

export const analyticsApi = {
  overview: (companyId?: string) => get('/analytics/overview', companyId ? { params: { companyId } } : undefined),
  funnel: (days = 14) => get('/analytics/funnel', { params: { days } }),
  noShow: (companyId?: string) => get('/analytics/no-show', companyId ? { params: { companyId } } : undefined),
  scheduleConflicts: () => get('/operator/schedule/conflicts'),
  forecast: (companyId?: string) => get('/analytics/forecast', companyId ? { params: { companyId } } : undefined),
  driverScorecards: (companyId?: string) => get('/analytics/driver-scorecards', companyId ? { params: { companyId } } : undefined),
};

// Help Center: tickets, knowledge base, AI assistant
export const helpApi = {
  createTicket: (body: { subject: string; category?: string; priority?: string; body?: string }) => post('/support/tickets', body),
  myTickets: () => get('/support/my-tickets'),
  ticket: (id: string) => get(`/support/tickets/${id}`),
  reply: (id: string, body: string) => post(`/support/tickets/${id}/reply`, { body }),
  rate: (id: string, rating: number, comment?: string) => post(`/support/tickets/${id}/rate`, { rating, comment }),
  searchKb: (q: string) => get('/knowledge/search/q', { params: { q } }),
  reportLost: (body: any) => post('/care/lost-found', body),
  myLostItems: () => get('/care/lost-found/mine'),
  sos: (body: { type: string; tripId?: string; lat?: number; lng?: number; note?: string }) => post('/care/sos', body),
};

export const securityApi = {
  status: () => get('/security/status'),
  setup2fa: () => post('/security/2fa/setup'),
  enable2fa: (code: string) => post('/security/2fa/enable', { code }),
  disable2fa: (code: string) => post('/security/2fa/disable', { code }),
  loginHistory: () => get('/security/login-history'),
};

export const profileApi = {
  travelers: () => get('/profile/travelers'),
  addTraveler: (b: any) => post('/profile/travelers', b),
  removeTraveler: (id: string) => del(`/profile/travelers/${id}`),
  addresses: () => get('/profile/addresses'),
  addAddress: (b: any) => post('/profile/addresses', b),
  removeAddress: (id: string) => del(`/profile/addresses/${id}`),
  getPrefs: () => get('/profile/notification-prefs'),
  setPrefs: (prefs: any) => api.put('/profile/notification-prefs', prefs) as unknown as Promise<any>,
};

export const assistantApi = {
  chat: (message: string, history: any[] = []) => post('/assistant/chat', { message, history }),
};

export const eventsApi = {
  // Fire-and-forget funnel tracking — never block the UI on it.
  funnel: (stage: string, meta: { tripId?: string; sessionId?: string; userId?: string } = {}) => {
    try { post('/events/funnel', { stage, ...meta }); } catch { /* ignore */ }
  },
};

export const trackingApi = {
  live: () => get('/tracking/live'),
  eta: (tripId: string) => get(`/tracking/${tripId}/eta`),
  history: (tripId: string) => get(`/tracking/${tripId}/history`),
  notifyArrival: (tripId: string) => post(`/bookings/${tripId}/notify-arrival`),
};

export const aiApi = {
  priceSuggestion: (tripId: string) => get(`/ai/price-suggestion/${tripId}`),
};

export const couponApi = {
  validate: (code: string, amount: number) => post('/coupons/validate', { code, amount }),
  list: () => get('/coupons'),
  create: (data: any) => post('/coupons', data),
};

export const walletApi = {
  get: () => get('/wallet'),
  topup: (amount: number) => post('/wallet/topup', { amount }),
  redeemPoints: (points: number) => post('/wallet/redeem-points', { points }),
};

export const driverApi = {
  myTrips: () => get('/driver/trips'),
  startTrip: (tripId: string) => post(`/driver/trips/${tripId}/start`),
  endTrip: (tripId: string) => post(`/driver/trips/${tripId}/end`),
  ping: (data: { tripId: string; lat: number; lng: number; speed?: number }) =>
    post('/tracking/location', data),
  // Company-side: verify a driver's portable record by CNIC
  verifyByCnic: (cnic: string) => get('/drivers/verify', { params: { cnic } }),
  // Passenger leaves a rating/remark on a driver after a trip
  review: (driverId: string, data: { rating: number; remark?: string; tripId?: string; byName?: string }) =>
    post(`/drivers/${driverId}/reviews`, data),
};

export const agentApi = {
  // Walk-in booking issued on behalf of a customer (bookedById = agent)
  book: (data: any) => post('/bookings/agent', data),
  summary: () => get('/bookings/agent/summary'),
};
