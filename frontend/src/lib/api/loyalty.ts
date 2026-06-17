import { api } from './client';

export const loyaltyApi = {
  getBalance: () => api.get('/loyalty/balance').then((r) => r.data),
  getHistory: (page = 1, limit = 20) =>
    api.get('/loyalty/history', { params: { page, limit } }).then((r) => r.data),
  redeem: (points: number, bookingId?: string) =>
    api.post('/loyalty/redeem', { points, bookingId }).then((r) => r.data),
};
