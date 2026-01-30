import http from 'http';
import Koa from 'koa';
import router from './router.ts';
import { logger } from './src/logger.ts';
import { metricsCollector } from './src/metrics.ts';
import { requestLoggingMiddleware } from './src/middleware.ts';

process.on('uncaughtException', (e) => {
  logger.error('uncaughtException', {
    error: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : undefined,
  });
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  logger.error('unhandledRejection', {
    error: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : undefined,
  });
  process.exit(1);
});

const app = new Koa();

app.use(requestLoggingMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());

export const server = http.createServer(app.callback());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 80;

server.listen(PORT, () => {
  logger.info(`http serving on port ${PORT}`);
});

let shutdown = false;

const closeGracefully = (signal: string) => () => {
  logger.info(`Received ${signal} signal`);
  if (shutdown) return;

  logger.info('Shutting down gracefully...');
  shutdown = true;
  metricsCollector.recordSignal(signal);

  const shutdownStartTime = Date.now();

  const shutdownTimer = setTimeout(() => {
    const duration = Date.now() - shutdownStartTime;
    logger.error('Could not close connections in time, forcefully shutting down', {
      durationMs: duration,
      metrics: metricsCollector.getMetrics(),
    });
    process.exit(1);
  }, 30000);

  server.close(() => {
    clearTimeout(shutdownTimer);
    const duration = Date.now() - shutdownStartTime;
    logger.info('Closed out remaining connections', {
      shutdownDurationMs: duration,
      metrics: metricsCollector.getMetrics(),
    });
    process.exit(0);
  });
};

process.on('SIGHUP', closeGracefully('SIGHUP'));
process.on('SIGTERM', closeGracefully('SIGTERM'));
process.on('SIGINT', closeGracefully('SIGINT'));
