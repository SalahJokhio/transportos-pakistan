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
};
