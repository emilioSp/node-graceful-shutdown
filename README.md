# node-graceful-shutdown

Example of graceful shutdown implementation in Node.js using native TypeScript support (Node.js 24+).

## Features

- Native TypeScript (no build step required)
- Koa 3.x with modern ES modules
- Graceful shutdown on SIGTERM, SIGINT, and SIGHUP
- Comprehensive test suite using Node.js built-in test runner

## Requirements

- Node.js >= 24.0.0

## Usage

### Local Development

```bash
npm install
npm run serve  # or: PORT=3000 npm run serve
```

### Docker

```bash
docker-compose up --build
curl localhost/delayed
docker stop -t 100 node-graceful-shutdown
```

## Testing

```bash
npm test
```

## API Endpoints

- `GET /healthcheck` - Returns `{ alive: true }`
- `GET /delayed` - Returns `{ ok: true }` after 10 seconds (useful for testing graceful shutdown)

---

<a href="https://www.buymeacoffee.com/emiliosp" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
