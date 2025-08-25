// shared/utils/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const activeConnections = new Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

export const recommendationAccuracy = new Gauge({
  name: 'recommendation_accuracy',
  help: 'Accuracy of recommendation engine',
  registers: [register]
});