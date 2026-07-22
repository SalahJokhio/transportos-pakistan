import { Injectable } from '@nestjs/common';

/**
 * Dependency-free metrics registry. Records HTTP request counts + latency and
 * renders them in Prometheus text format at /metrics — enough for real
 * dashboards/alerts without pulling in a client library.
 */
@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly counts = new Map<string, number>();      // method|route|status -> count
  private readonly durSum = new Map<string, number>();       // method|route -> total ms
  private readonly durCount = new Map<string, number>();     // method|route -> n

  record(method: string, route: string, status: number, ms: number) {
    const ck = `${method}|${route}|${status}`;
    this.counts.set(ck, (this.counts.get(ck) ?? 0) + 1);
    const dk = `${method}|${route}`;
    this.durSum.set(dk, (this.durSum.get(dk) ?? 0) + ms);
    this.durCount.set(dk, (this.durCount.get(dk) ?? 0) + 1);
  }

  private esc(v: string) { return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  render(): string {
    const lines: string[] = [];
    lines.push('# HELP transportos_uptime_seconds Process uptime in seconds.');
    lines.push('# TYPE transportos_uptime_seconds gauge');
    lines.push(`transportos_uptime_seconds ${((Date.now() - this.startedAt) / 1000).toFixed(0)}`);

    const mem = process.memoryUsage();
    lines.push('# HELP transportos_process_resident_memory_bytes Resident memory.');
    lines.push('# TYPE transportos_process_resident_memory_bytes gauge');
    lines.push(`transportos_process_resident_memory_bytes ${mem.rss}`);

    lines.push('# HELP transportos_http_requests_total Total HTTP requests.');
    lines.push('# TYPE transportos_http_requests_total counter');
    for (const [k, v] of this.counts) {
      const [method, route, status] = k.split('|');
      lines.push(`transportos_http_requests_total{method="${this.esc(method)}",route="${this.esc(route)}",status="${status}"} ${v}`);
    }

    lines.push('# HELP transportos_http_request_duration_ms_avg Average request duration (ms).');
    lines.push('# TYPE transportos_http_request_duration_ms_avg gauge');
    for (const [k, sum] of this.durSum) {
      const [method, route] = k.split('|');
      const n = this.durCount.get(k) ?? 1;
      lines.push(`transportos_http_request_duration_ms_avg{method="${this.esc(method)}",route="${this.esc(route)}"} ${(sum / n).toFixed(2)}`);
    }
    return lines.join('\n') + '\n';
  }
}
