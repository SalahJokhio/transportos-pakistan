import { api } from './client';

const post = (url: string, data?: any): Promise<any> => api.post(url, data) as unknown as Promise<any>;
const get = (url: string, params?: any): Promise<any> => api.get(url, { params }) as unknown as Promise<any>;

export const operatorApi = {
  dashboard: () => get('/operator/dashboard'),
  getRoutes: () => get('/operator/routes'),
  createRoute: (data: any) => post('/operator/routes', data),
  getBuses: () => get('/operator/buses'),
  createBus: (data: any) => post('/operator/buses', data),
  getTrips: (date?: string) => get('/operator/trips', date ? { date } : undefined),
  createTrip: (data: any) => post('/operator/trips', data),
  updateTripStatus: (tripId: string, status: string) =>
    api.patch(`/operator/trips/${tripId}/status`, { status }),
  getManifest: (tripId: string) => get(`/bookings/manifest/${tripId}`),
  dispatchDecision: (tripId: string) => post(`/decisions/delay/${tripId}`),
  dispatchBoard: () => get('/dispatch/board'),
  fleetReport: () => get('/operator/fleet-report'),
  tripReports: (tripId: string) => get(`/operator/trips/${tripId}/reports`),
  reports: () => get('/operator/reports'),
  drivers: () => get('/operator/drivers'),
  assignDriver: (tripId: string, driverId: string) =>
    api.patch(`/operator/trips/${tripId}/driver`, { driverId }),

  // Terminals + boarding points
  getTerminals: (city?: string) => get('/operator/terminals', city ? { city } : undefined),
  createTerminal: (data: any) => post('/operator/terminals', data),
  removeTerminal: (id: string) => api.delete(`/operator/terminals/${id}`),

  // Recurring schedules
  getSchedules: () => get('/operator/schedules'),
  createSchedule: (data: any) => post('/operator/schedules', data),
  removeSchedule: (id: string) => api.delete(`/operator/schedules/${id}`),
  generateSchedules: () => post('/operator/schedules/generate'),

  // Staff / HR
  employeeStats: () => get('/operator/employees/stats'),
  employees: (params?: { type?: string; status?: string; search?: string }) =>
    get('/operator/employees', params),
  employee: (id: string) => get(`/operator/employees/${id}`),
  createEmployee: (data: any) => post('/operator/employees', data),
  updateEmployee: (id: string, patch: any) => api.patch(`/operator/employees/${id}`, patch),
};

// Base for uploaded photos (served outside the /api/v1 prefix)
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');
