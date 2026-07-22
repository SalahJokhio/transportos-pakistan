import { api } from './client';

const BASE = '/admin';

// The response interceptor already returns res.data at runtime, but axios types
// it as AxiosResponse — cast so callers get the unwrapped payload as `any`
// (same pattern as endpoints.ts).
const g = (url: string, config?: any): Promise<any> => api.get(url, config) as unknown as Promise<any>;
const p = (url: string, data?: any): Promise<any> => api.post(url, data) as unknown as Promise<any>;
const pt = (url: string, data?: any): Promise<any> => api.put(url, data) as unknown as Promise<any>;
const pc = (url: string, data?: any): Promise<any> => api.patch(url, data) as unknown as Promise<any>;
const d = (url: string, config?: any): Promise<any> => api.delete(url, config) as unknown as Promise<any>;

export const adminApi = {
  getStats: () => g(`${BASE}/stats`),

  listUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) => g(`${BASE}/users`, { params }),

  updateRole: (id: string, role: string) =>
    pc(`${BASE}/users/${id}/role`, { role }),

  activateUser: (id: string) => p(`${BASE}/users/${id}/activate`),
  deactivateUser: (id: string) => p(`${BASE}/users/${id}/deactivate`),

  getRevenue: () => g(`${BASE}/revenue`),

  getOperators: () => g(`${BASE}/operators`),
  approveOperator: (id: string) => p(`${BASE}/operators/${id}/approve`),

  // Disputes / fraud queue
  getDisputes: (status?: string) =>
    g(`${BASE}/disputes`, { params: status ? { status } : {} }),
  resolveDispute: (id: string, status: string, resolution?: string) =>
    pc(`${BASE}/disputes/${id}/resolve`, { status, resolution }),
  getFraudSignals: () => g(`${BASE}/fraud-signals`),

  // Settlements (operator payouts)
  getSettlementSummary: () => g(`${BASE}/settlements/summary`),
  listSettlements: (status?: string) =>
    g(`${BASE}/settlements`, { params: status ? { status } : {} }),
  generateSettlement: (companyId: string) =>
    p(`${BASE}/settlements/generate`, { companyId }),
  paySettlement: (id: string, reference?: string) =>
    p(`${BASE}/settlements/${id}/pay`, { reference }),

  // Payments & refunds
  listPayments: (limit?: number) =>
    g(`${BASE}/payments`, { params: limit ? { limit } : {} }),
  refundPayment: (id: string, amount?: number, reason?: string) =>
    p(`${BASE}/payments/${id}/refund`, { amount, reason }),

  // Multi-tenant: companies
  getCompanies: () => g(`${BASE}/companies`),
  updateCompany: (companyId: string, data: any) =>
    pc(`${BASE}/companies/${companyId}`, data),
  suspendCompany: (companyId: string) => p(`${BASE}/companies/${companyId}/suspend`),
  activateCompany: (companyId: string) => p(`${BASE}/companies/${companyId}/activate`),

  // CMS / catalog
  getCities: () => g(`${BASE}/catalog/cities`),
  addCity: (data: any) => p(`${BASE}/catalog/cities`, data),
  updateCity: (id: string, data: any) => pc(`${BASE}/catalog/cities/${id}`, data),
  deleteCity: (id: string) => d(`${BASE}/catalog/cities/${id}`),
  getBanners: () => g(`${BASE}/catalog/banners`),
  addBanner: (data: any) => p(`${BASE}/catalog/banners`, data),
  deleteBanner: (id: string) => d(`${BASE}/catalog/banners/${id}`),
  getFareRules: () => g(`${BASE}/catalog/fare-rules`),
  setFareRules: (data: any) => pt(`${BASE}/catalog/fare-rules`, data),

  // Compliance / KYC
  getComplianceExpiring: (days = 30) => g(`${BASE}/compliance/expiring`, { params: { days } }),
  getComplianceDocs: () => g(`${BASE}/compliance`),
  addComplianceDoc: (data: any) => p(`${BASE}/compliance`, data),
  verifyComplianceDoc: (id: string, status: string, notes?: string) =>
    pc(`${BASE}/compliance/${id}/verify`, { status, notes }),
  deleteComplianceDoc: (id: string) => d(`${BASE}/compliance/${id}`),

  // Audit log + RBAC
  getAuditLogs: (limit = 100) => g(`${BASE}/audit-logs`, { params: { limit } }),
  getRbac: () => g(`${BASE}/rbac`),
  setRbac: (matrix: Record<string, string[]>) => pt(`${BASE}/rbac`, { matrix }),

  // Broadcast center
  getBroadcasts: () => g(`${BASE}/broadcasts`),
  segmentSize: (segment: string) => g(`${BASE}/broadcasts/segment-size`, { params: { segment } }),
  sendBroadcast: (data: any) => p(`${BASE}/broadcasts`, data),

  // Support / ticketing
  getTickets: (status?: string) => g(`${BASE}/support`, { params: status ? { status } : {} }),
  getTicket: (id: string) => g(`${BASE}/support/${id}`),
  replyTicket: (id: string, body: string, isInternal = false) => p(`${BASE}/support/${id}/reply`, { body, isInternal }),
  updateTicket: (id: string, data: any) => pc(`${BASE}/support/${id}`, data),
  getCannedReplies: () => g(`${BASE}/support/canned`),

  // Fraud rules / exports / health (#7, #8, #9)
  getFraudRules: () => g(`${BASE}/fraud/rules`),
  setFraudRules: (data: any) => pt(`${BASE}/fraud/rules`, data),
  evaluateFraud: () => g(`${BASE}/fraud/evaluate`),
  exportBookingsCsv: (from?: string, to?: string) => g(`${BASE}/exports/bookings.csv`, { params: { from, to } }),
  exportPaymentsCsv: (from?: string, to?: string) => g(`${BASE}/exports/payments.csv`, { params: { from, to } }),
  getSystemHealth: () => g(`${BASE}/system-health`),

  // Feature flags
  getFlags: () => g(`${BASE}/flags`),
  setFlags: (flags: Record<string, boolean>) => pt(`${BASE}/flags`, flags),

  // Double-entry ledger
  getLedger: (limit = 100) => g(`${BASE}/ledger`, { params: { limit } }),
  getLedgerBalances: () => g(`${BASE}/ledger/balances`),

  // Operator lending
  getLoans: (status?: string) => g(`${BASE}/lending`, { params: status ? { status } : {} }),
  approveLoan: (id: string) => p(`${BASE}/lending/${id}/approve`),
  disburseLoan: (id: string) => p(`${BASE}/lending/${id}/disburse`),
};

export const disputesApi = {
  raise: (body: { type: string; subject: string; description?: string; bookingId?: string; pnr?: string }) =>
    p('/disputes', body),
  mine: () => g('/disputes/mine'),
};

// Rules + Event Engine (no-code automation)
export const automationApi = {
  listRules: () => g('/automation/rules'),
  createRule: (body: any) => p('/automation/rules', body),
  updateRule: (id: string, patch: any) => pc(`/automation/rules/${id}`, patch),
  removeRule: (id: string) => d(`/automation/rules/${id}`),
  simulate: (type: string, payload: any) => p('/automation/simulate', { type, payload }),
  emit: (type: string, payload: any) => p('/automation/emit', { type, payload }),
  events: (type?: string) => g('/automation/events', { params: type ? { type } : {} }),
  alerts: (unread?: boolean) => g('/automation/alerts', { params: unread ? { unread: true } : {} }),
  markAlertRead: (id: string) => pc(`/automation/alerts/${id}/read`),
};

// Approval Workflow Engine
export const workflowApi = {
  listDefinitions: () => g('/workflows/definitions'),
  createDefinition: (body: any) => p('/workflows/definitions', body),
  updateDefinition: (id: string, patch: any) => pc(`/workflows/definitions/${id}`, patch),
  removeDefinition: (id: string) => d(`/workflows/definitions/${id}`),
  start: (body: any) => p('/workflows/instances', body),
  listInstances: (status?: string) => g('/workflows/instances', { params: status ? { status } : {} }),
  inbox: () => g('/workflows/instances/inbox'),
  getInstance: (id: string) => g(`/workflows/instances/${id}`),
  approve: (id: string, note?: string) => p(`/workflows/instances/${id}/approve`, { note }),
  reject: (id: string, note?: string) => p(`/workflows/instances/${id}/reject`, { note }),
  cancel: (id: string) => p(`/workflows/instances/${id}/cancel`),
};

// Executive AI Copilot
export const copilotApi = {
  ask: (question: string): Promise<any> => p('/copilot/ask', { question }),
  snapshot: () => g('/copilot/snapshot'),
};

// Department AI Agents
export const agentsApi = {
  overview: () => g('/agents/overview'),
  run: (domain: 'dispatch' | 'finance' | 'fleet' | 'hr' | 'crm' | 'workshop') => g(`/agents/${domain}`),
  act: (action: any, domain?: string) => p('/agents/act', { action, domain }),
};

// Digital Twin — what-if simulation
export const simulationApi = {
  run: (scenario: string, params: any): Promise<any> => p(`/simulate/${scenario}`, params),
};

// Policy Engine
export const policyApi = {
  get: () => g('/policies'),
  update: (values: Record<string, number>) => pt('/policies', values),
  check: (type: string, value: number) => p('/policies/check', { type, value }),
};
