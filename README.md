# node-graceful-shutdown

Node best practices example: Graceful Shutdown with Koa and TypeScript

## Features

- Native TypeScript (no build step required)
- Koa 3.x with modern ES modules
- Graceful shutdown on SIGTERM, SIGINT, and SIGHUP
- Comprehensive test suite using Node.js built-in test runner
- **Structured logging with JSON support**
- **Request tracing and metrics collection**
- **Health check and info endpoints**

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
- `GET /info` - Returns application info (version, uptime, memory usage)
- `GET /metrics` - Returns request metrics (count, duration stats, signal counts)
- `GET /delayed` - Returns `{ ok: true }` after 10 seconds (useful for testing graceful shutdown)

## Observability

### Logging

The application uses structured logging with support for JSON and text formats.

**Environment Variables:**
- `LOG_LEVEL` - Log level (debug|info|warn|error, default: info)
- `LOG_FORMAT` - Log format (json|text, default: text)

**Text Format Example:**
```
http serving on port 80
Request completed {"requestId":1,"method":"GET","path":"/healthcheck","status":200,"durationMs":1}
```

**JSON Format Example (for production):**
```bash
LOG_FORMAT=json node index.ts
```
```json
{"timestamp":"2026-01-29T22:32:51.293Z","level":"info","message":"http serving on port 80"}
{"timestamp":"2026-01-29T22:32:52.100Z","level":"info","message":"Request completed","requestId":1,"method":"GET","path":"/healthcheck","status":200,"durationMs":1}
```

### Metrics

The `/metrics` endpoint exposes:
- Request count and error count
- Request latency statistics (min, max, average duration)
- Signal received counts (SIGTERM, SIGINT, SIGHUP)
- Application uptime

**Example Response:**
```json
{
  "requestCount": 5,
  "errorCount": 0,
  "totalDuration": 125,
  "minDuration": 1,
  "maxDuration": 100,
  "avgDurationMs": 25,
  "signalCounts": {},
  "startTime": 1769726080874,
  "uptimeSeconds": 1.234
}
```

### Request Tracing

Each request is assigned a unique ID for tracing through logs. The middleware logs:
- Request start (debug level)
- Request completion with duration and status code (info level)
- Request errors with stack trace (error level)

---

<a href="https://www.buymeacoffee.com/emiliosp" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
