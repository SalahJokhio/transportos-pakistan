import { api } from './client';

const BASE = '/admin';

export const adminApi = {
  getStats: () => api.get(`${BASE}/stats`).then((r) => r.data),

  listUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) => api.get(`${BASE}/users`, { params }).then((r) => r.data),

  updateRole: (id: string, role: string) =>
    api.patch(`${BASE}/users/${id}/role`, { role }).then((r) => r.data),

  activateUser: (id: string) => api.post(`${BASE}/users/${id}/activate`).then((r) => r.data),
  deactivateUser: (id: string) => api.post(`${BASE}/users/${id}/deactivate`).then((r) => r.data),

  getRevenue: () => api.get(`${BASE}/revenue`).then((r) => r.data),

  getOperators: () => api.get(`${BASE}/operators`).then((r) => r.data),
  approveOperator: (id: string) => api.post(`${BASE}/operators/${id}/approve`).then((r) => r.data),

  // Disputes / fraud queue
  getDisputes: (status?: string) =>
    api.get(`${BASE}/disputes`, { params: status ? { status } : {} }).then((r) => r.data),
  resolveDispute: (id: string, status: string, resolution?: string) =>
    api.patch(`${BASE}/disputes/${id}/resolve`, { status, resolution }).then((r) => r.data),
  getFraudSignals: () => api.get(`${BASE}/fraud-signals`).then((r) => r.data),
};

export const disputesApi = {
  raise: (body: { type: string; subject: string; description?: string; bookingId?: string; pnr?: string }) =>
    api.post('/disputes', body).then((r) => r.data),
  mine: () => api.get('/disputes/mine').then((r) => r.data),
};
