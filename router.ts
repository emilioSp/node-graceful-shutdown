import Router from '@koa/router';
import { setTimeout } from 'timers/promises';
import { logger } from './src/logger.ts';
import { metricsCollector } from './src/metrics.ts';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);

const router = new Router();

router.get('/healthcheck', (ctx) => {
  ctx.body = { alive: true };
});

router.get('/info', (ctx) => {
  const metrics = metricsCollector.getMetrics();
  ctx.body = {
    version: packageJson.version,
    nodeVersion: process.version,
    uptime: metrics.uptimeSeconds,
    memory: process.memoryUsage(),
  };
});

router.get('/metrics', (ctx) => {
  const metrics = metricsCollector.getMetrics();
  ctx.body = metrics;
});

router.get('/delayed', async (ctx) => {
  logger.debug('Delayed endpoint called');
  await setTimeout(10000);
  ctx.body = { ok: true };
});

export default router;
