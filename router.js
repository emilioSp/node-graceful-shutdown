import Router from '@koa/router';
import { setTimeout } from 'timers/promises';

const router = Router();

router.get('/healthcheck', (ctx) => {
  ctx.body = { alive: true };
});

router.get('/delayed', async (ctx) => {
  await setTimeout(10000);
  ctx.body = { ok: true };
});


export default router;
