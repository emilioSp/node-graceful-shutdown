import http from 'http';
import Koa from 'koa';
import router from './router.ts';

process.on('uncaughtException', (e) => {
  console.error('uncaughtException', e);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('unhandledRejection', e);
  process.exit(1);
});

const app = new Koa();

app.use(router.routes());
app.use(router.allowedMethods());

export const server = http.createServer(app.callback());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 80;

server.listen(PORT, () => {
  console.info(`http serving on port ${PORT}`);
});

let shutdown = false;

const closeGracefully = (signal: string) => () => {
  console.log(`Received ${signal} signal`);
  if (shutdown) return;

  console.log('Shutting down gracefully...');
  shutdown = true;

  // Forcefully close the server if there are other ongoing connections
  const shutdownTimer = setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);

  // Stop server from receiving new connections
  server.close(() => {
    clearTimeout(shutdownTimer);
    console.log('Closed out remaining connections');
    process.exit(0);
  });
};

process.on('SIGHUP', closeGracefully('SIGHUP'));
process.on('SIGTERM', closeGracefully('SIGTERM'));
process.on('SIGINT', closeGracefully('SIGINT'));
