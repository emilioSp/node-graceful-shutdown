import http from 'http';
import koa from 'koa';
import router from './router.js';

process.on('uncaughtException', (e) => console.error('uncaughtException', e));
process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));

const app = new koa();

app.use(router.routes());
app.use(router.allowedMethods());

export const server = http.createServer(app.callback());

server.listen(80, async (error) => {
  error ? console.error(error) : console.info('http serving on port 80');
});

let shutdown = false;
const closeGracefull = (signal) => () => {
  console.log(`Received ${signal} signal`);
  if (shutdown) return;

  console.log('Shutdown gracefully...');
  shutdown = true;

  // Forcefully close the server if there are other ongoing connections
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);

  // Stop server from receiving new connection
  server.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });
}

process.on('SIGHUP', closeGracefull('SIGHUP'));
process.on('SIGTERM', closeGracefull('SIGTERM'));
process.on('SIGINT', closeGracefull('SIGINT'));
