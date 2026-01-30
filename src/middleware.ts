import { logger } from './logger.ts';
import { metricsCollector } from './metrics.ts';
import type { DefaultContext, DefaultState, Next } from 'koa';
import type Koa from 'koa';

let requestIdCounter = 0;

export const requestLoggingMiddleware = async (
  ctx: Koa.ParameterizedContext<DefaultState, DefaultContext>,
  next: Next
): Promise<void> => {
  const requestId = ++requestIdCounter;
  const startTime = Date.now();

  ctx.state.requestId = requestId;

  logger.debug(`Request started`, {
    requestId,
    method: ctx.method,
    path: ctx.path,
  });

  try {
    await next();
  } catch (error) {
    const duration = Date.now() - startTime;
    metricsCollector.recordRequest(duration, true);

    logger.error(`Request error`, {
      requestId,
      method: ctx.method,
      path: ctx.path,
      durationMs: duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }

  const duration = Date.now() - startTime;
  metricsCollector.recordRequest(duration, false);

  logger.info(`Request completed`, {
    requestId,
    method: ctx.method,
    path: ctx.path,
    status: ctx.status,
    durationMs: duration,
  });
};
