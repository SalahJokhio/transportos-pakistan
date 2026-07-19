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

  // Settlements (operator payouts)
  getSettlementSummary: () => api.get(`${BASE}/settlements/summary`).then((r) => r.data),
  listSettlements: (status?: string) =>
    api.get(`${BASE}/settlements`, { params: status ? { status } : {} }).then((r) => r.data),
  generateSettlement: (companyId: string) =>
    api.post(`${BASE}/settlements/generate`, { companyId }).then((r) => r.data),
  paySettlement: (id: string, reference?: string) =>
    api.post(`${BASE}/settlements/${id}/pay`, { reference }).then((r) => r.data),

  // Payments & refunds
  listPayments: (limit?: number) =>
    api.get(`${BASE}/payments`, { params: limit ? { limit } : {} }).then((r) => r.data),
  refundPayment: (id: string, amount?: number, reason?: string) =>
    api.post(`${BASE}/payments/${id}/refund`, { amount, reason }).then((r) => r.data),

  // Multi-tenant: companies
  getCompanies: () => api.get(`${BASE}/companies`).then((r) => r.data),
  updateCompany: (companyId: string, data: any) =>
    api.patch(`${BASE}/companies/${companyId}`, data).then((r) => r.data),
  suspendCompany: (companyId: string) => api.post(`${BASE}/companies/${companyId}/suspend`).then((r) => r.data),
  activateCompany: (companyId: string) => api.post(`${BASE}/companies/${companyId}/activate`).then((r) => r.data),
};

export const disputesApi = {
  raise: (body: { type: string; subject: string; description?: string; bookingId?: string; pnr?: string }) =>
    api.post('/disputes', body).then((r) => r.data),
  mine: () => api.get('/disputes/mine').then((r) => r.data),
};
