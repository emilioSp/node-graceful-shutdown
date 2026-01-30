type Metrics = {
  requestCount: number;
  errorCount: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  signalCounts: Record<string, number>;
  startTime: string;
};

type MetricsCollector = {
  recordRequest: (durationMs: number, isError?: boolean) => void;
  recordSignal: (signal: string) => void;
  getMetrics: () => Metrics & { uptimeSeconds: number; avgDurationMs: number };
};

const createMetricsCollector = (): MetricsCollector => {
  const metrics: Metrics = {
    requestCount: 0,
    errorCount: 0,
    totalDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    signalCounts: {},
    startTime: new Date().toISOString(),
  };

  return {
    recordRequest: (durationMs: number, isError: boolean = false) => {
      metrics.requestCount++;
      metrics.totalDuration += durationMs;
      metrics.minDuration = Math.min(metrics.minDuration, durationMs);
      metrics.maxDuration = Math.max(metrics.maxDuration, durationMs);
      if (isError) metrics.errorCount++;
    },

    recordSignal: (signal: string) => {
      metrics.signalCounts[signal] = (metrics.signalCounts[signal] || 0) + 1;
    },

    getMetrics: () => {
      const uptimeSeconds = (Date.now() - new Date(metrics.startTime).getTime()) / 1000;
      const avgDurationMs =
        metrics.requestCount > 0
          ? metrics.totalDuration / metrics.requestCount
          : 0;

      return {
        ...metrics,
        uptimeSeconds,
        avgDurationMs,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
      };
    },
  };
};

export const metricsCollector = createMetricsCollector() as MetricsCollector;
