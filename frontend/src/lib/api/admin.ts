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
};
