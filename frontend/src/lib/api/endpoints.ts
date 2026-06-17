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
  getSeatMap: (id: string) => get(`/trips/${id}/seats`),
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
  cancel: (id: string, reason: string) => del(`/bookings/${id}/cancel`, { data: { reason } }),
};

export const paymentApi = {
  initiate: (data: { bookingId: string; method: 'jazzcash' | 'easypaisa'; amount: number }) =>
    post('/payments/initiate', data),
};
