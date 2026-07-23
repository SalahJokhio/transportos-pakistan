import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../booking-service/src/entities/booking.entity';

export interface Kpi { key: string; label: string; value: number | string; unit: string; hint: string }

/**
 * KPI Engine (blueprint line 824). Computes the operating KPIs the doc lists —
 * revenue, occupancy, fuel efficiency, vehicle utilization, driver rating,
 * average delay, workshop efficiency, complaint resolution — from live data.
 */
@Injectable()
export class KpiService {
  constructor(@InjectRepository(Booking) private readonly repo: Repository<Booking>) {}

  private q<T = any>(sql: string, p: any[] = []): Promise<T[]> { return this.repo.query(sql, p); }
  private n(v: any): number { return Number(v) || 0; }

  async overview(companyId?: string): Promise<Kpi[]> {
    const tScope = companyId ? `AND t."companyId" = $1` : ``;
    const p = companyId ? [companyId] : [];

    const [rev, occ, fuel, util, rating, delay, workshop, complaints] = await Promise.all([
      // Revenue (confirmed, 30d)
      this.q(`SELECT COALESCE(SUM(b."finalAmount"),0) v FROM bookings b JOIN trips t ON t.id::text=b."tripId"
              WHERE b.status='CONFIRMED' AND b."createdAt">=now()-interval '30 days' ${tScope}`, p),
      // Occupancy: confirmed seats / total seats across recent trips
      this.q(`SELECT COALESCE(SUM((SELECT count(*) FROM jsonb_object_keys(t."seatAvailability") k WHERE t."seatAvailability"->>k='BOOKED')),0) booked,
                     COALESCE(SUM((SELECT count(*) FROM jsonb_object_keys(t."seatAvailability"))),0) total
              FROM trips t WHERE t."departureTime">=now()-interval '30 days' ${tScope}`, p),
      // Fuel efficiency: fuel spend / distance
      this.q(`SELECT COALESCE(SUM(tr.amount),0) fuel FROM trip_reports tr
              WHERE (tr.type='refuel' OR LOWER(tr.category) LIKE '%fuel%') AND tr."createdAt">=now()-interval '30 days'
              ${companyId ? `AND tr."companyId"=$1` : ``}`, p),
      // Vehicle utilization: trips per active bus (30d)
      this.q(`SELECT COUNT(*)::float trips, COUNT(DISTINCT t."busId")::float buses FROM trips t
              WHERE t."departureTime">=now()-interval '30 days' ${tScope}`, p),
      // Driver rating
      this.q(`SELECT COALESCE(AVG(NULLIF(rating,0)),0) r FROM employees WHERE "employeeType"='DRIVER' ${companyId ? `AND "companyId"=$1` : ``}`, p),
      // Average departure delay (minutes)
      this.q(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (t."actualDepartureTime"-t."departureTime"))/60),0) d
              FROM trips t WHERE t."actualDepartureTime" IS NOT NULL AND t."departureTime">=now()-interval '30 days' ${tScope}`, p),
      // Workshop: incidents in 30d (lower is better)
      this.q(`SELECT COUNT(*)::int n FROM trip_reports tr WHERE tr.type='incident' AND tr."createdAt">=now()-interval '30 days'
              ${companyId ? `AND tr."companyId"=$1` : ``}`, p),
      // Complaint resolution: avg hours to resolve + % within 24h (support is platform-wide)
      this.q(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("resolvedAt"-"createdAt"))/3600),0) avg_h,
                     COALESCE(AVG(CASE WHEN "resolvedAt" IS NOT NULL AND EXTRACT(EPOCH FROM ("resolvedAt"-"createdAt"))/3600<=24 THEN 1 ELSE 0 END)::float,0) within
              FROM support_tickets WHERE "resolvedAt" IS NOT NULL`),
    ]);

    const distanceKm = await this.q(`SELECT COALESCE(SUM(r."distanceKm"),0) km FROM trips t JOIN routes r ON r.id::text=t."routeId"
              WHERE t."departureTime">=now()-interval '30 days' ${tScope}`, p);

    const bookedSeats = this.n(occ[0]?.booked), totalSeats = this.n(occ[0]?.total);
    const occupancy = totalSeats ? (bookedSeats / totalSeats) * 100 : 0;
    const fuelSpend = this.n(fuel[0]?.fuel), km = this.n(distanceKm[0]?.km);
    const utilTrips = this.n(util[0]?.trips), utilBuses = this.n(util[0]?.buses);

    return [
      { key: 'revenue', label: 'Revenue (30d)', value: Math.round(this.n(rev[0]?.v)), unit: 'Rs', hint: 'Confirmed bookings, last 30 days' },
      { key: 'occupancy', label: 'Seat Occupancy', value: Math.round(occupancy), unit: '%', hint: `${bookedSeats}/${totalSeats} seats booked` },
      { key: 'fuel_efficiency', label: 'Fuel Cost / km', value: km ? Math.round((fuelSpend / km) * 100) / 100 : 0, unit: 'Rs/km', hint: `Rs ${Math.round(fuelSpend).toLocaleString()} over ${Math.round(km)} km` },
      { key: 'utilization', label: 'Vehicle Utilization', value: utilBuses ? Math.round((utilTrips / utilBuses) * 10) / 10 : 0, unit: 'trips/bus', hint: `${Math.round(utilTrips)} trips · ${Math.round(utilBuses)} buses (30d)` },
      { key: 'driver_rating', label: 'Avg Driver Rating', value: Math.round(this.n(rating[0]?.r) * 10) / 10, unit: '/ 5', hint: 'Mean of rated drivers' },
      { key: 'avg_delay', label: 'Avg Departure Delay', value: Math.round(this.n(delay[0]?.d)), unit: 'min', hint: 'Actual vs scheduled departure' },
      { key: 'workshop', label: 'Incidents (30d)', value: this.n(workshop[0]?.n), unit: 'reports', hint: 'On-road incidents reported by drivers' },
      { key: 'complaint_resolution', label: 'Complaint Resolution', value: Math.round(this.n(complaints[0]?.avg_h) * 10) / 10, unit: 'hrs avg', hint: `${Math.round(this.n(complaints[0]?.within) * 100)}% resolved within 24h` },
    ];
  }
}
