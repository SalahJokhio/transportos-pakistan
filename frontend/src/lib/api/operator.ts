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
  fleetReport: () => get('/operator/fleet-report'),
  tripReports: (tripId: string) => get(`/operator/trips/${tripId}/reports`),
  reports: () => get('/operator/reports'),
  drivers: () => get('/operator/drivers'),
  assignDriver: (tripId: string, driverId: string) =>
    api.patch(`/operator/trips/${tripId}/driver`, { driverId }),
};

// Base for uploaded photos (served outside the /api/v1 prefix)
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');
