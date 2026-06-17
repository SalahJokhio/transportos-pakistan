export enum EventType {
  // Booking Events
  BOOKING_INITIATED = 'booking.initiated',
  BOOKING_CONFIRMED = 'booking.confirmed',
  BOOKING_CANCELLED = 'booking.cancelled',
  SEAT_LOCKED = 'seat.locked',
  SEAT_RELEASED = 'seat.released',
  
  // Payment Events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',
  
  // Tracking Events
  VEHICLE_STARTED = 'vehicle.started',
  VEHICLE_LOCATION_UPDATED = 'vehicle.location.updated',
  VEHICLE_STOPPED = 'vehicle.stopped',
  
  // Operational Events
  MAINTENANCE_DUE = 'maintenance.due',
  DRIVER_ASSIGNED = 'driver.assigned',
  ROUTE_DELAYED = 'route.delayed',
  
  // User Events
  USER_REGISTERED = 'user.registered',
  USER_VERIFIED = 'user.verified',
  LOYALTY_POINTS_EARNED = 'loyalty.points.earned',
}