export interface EventPayload<T = any> {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string;
  data: T;
  metadata: {
    correlationId: string;
    causationId?: string;
    userId?: string;
  };
}