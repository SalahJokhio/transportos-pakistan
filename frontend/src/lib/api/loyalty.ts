import { api } from './client';

export const loyaltyApi = {
  getBalance: () => api.get('/loyalty/balance').then((r) => r.data),
  getHistory: (page = 1, limit = 20) =>
    api.get('/loyalty/history', { params: { page, limit } }).then((r) => r.data),
  redeem: (points: number, bookingId?: string) =>
    api.post('/loyalty/redeem', { points, bookingId }).then((r) => r.data),
  // The response interceptor already returns res.data, so no extra unwrap here.
  getTier: (): Promise<any> => api.get('/loyalty/tier') as unknown as Promise<any>,
};
