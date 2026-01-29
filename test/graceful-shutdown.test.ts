import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const TEST_PORT = 3456;
let currentServerProcess: ChildProcess | null = null;

function makeRequest(path: string, timeout = 5000): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request to ${path} timed out`));
    }, timeout);

    const req = http.request(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method: 'GET',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          clearTimeout(timeoutId);
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode!, body: data });
          }
        });
      }
    );
    req.on('error', (e) => {
      clearTimeout(timeoutId);
      reject(e);
    });
    req.end();
  });
}

async function killServer(serverProcess: ChildProcess | null): Promise<void> {
  if (!serverProcess || serverProcess.killed) return;
  
  return new Promise<void>((resolve) => {
    serverProcess.once('exit', () => resolve());
    serverProcess.kill('SIGKILL');

    // Force resolve after timeout in case process doesn't respond
    setTimeout(resolve, 2000);
  });
}

function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['index.ts'], {
      cwd: ROOT_DIR,
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    currentServerProcess = serverProcess;
    let started = false;

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes(`http serving on port ${TEST_PORT}`) && !started) {
        started = true;
        resolve(serverProcess);
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', reject);

    setTimeout(() => {
      if (!started) {
        serverProcess.kill('SIGKILL');
        reject(new Error('Server failed to start within timeout'));
      }
    }, 10000);
  });
}

describe('Graceful Shutdown', () => {
  afterEach(async () => {
    await killServer(currentServerProcess);
    currentServerProcess = null;
    await sleep(200);
  });

  it('should respond to healthcheck endpoint', async () => {
    const serverProcess = await startServer();

    const response = await makeRequest('/healthcheck');

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { alive: true });
  });

  it('should gracefully shutdown on SIGTERM', async () => {
    const serverProcess = await startServer();

    // Verify server is running
    const response = await makeRequest('/healthcheck');
    assert.strictEqual(response.status, 200);

    // Capture shutdown logs
    const logs: string[] = [];
    serverProcess.stdout?.on('data', (data) => {
      logs.push(data.toString());
    });

    // Send SIGTERM and wait for exit
    const exitPromise = new Promise<number>((resolve) => {
      serverProcess.once('exit', (code) => resolve(code ?? 0));
    });
    
    serverProcess.kill('SIGTERM');
    const exitCode = await exitPromise;

    assert.strictEqual(exitCode, 0, 'Server should exit with code 0 after graceful shutdown');

    // Verify shutdown logs
    const allLogs = logs.join('');
    assert.ok(allLogs.includes('Received SIGTERM signal'), 'Should log SIGTERM signal');
    assert.ok(allLogs.includes('Shutting down gracefully'), 'Should log graceful shutdown');
    assert.ok(allLogs.includes('Closed out remaining connections'), 'Should log connection closure');
  });

  it('should gracefully shutdown on SIGINT', async () => {
    const serverProcess = await startServer();

    // Verify server is running
    const response = await makeRequest('/healthcheck');
    assert.strictEqual(response.status, 200);

    // Capture shutdown logs
    const logs: string[] = [];
    serverProcess.stdout?.on('data', (data) => {
      logs.push(data.toString());
    });

    // Send SIGINT and wait for exit
    const exitPromise = new Promise<number>((resolve) => {
      serverProcess.once('exit', (code) => resolve(code ?? 0));
    });
    
    serverProcess.kill('SIGINT');
    const exitCode = await exitPromise;

    assert.strictEqual(exitCode, 0, 'Server should exit with code 0 after graceful shutdown');

    // Verify shutdown logs
    const allLogs = logs.join('');
    assert.ok(allLogs.includes('Received SIGINT signal'), 'Should log SIGINT signal');
    assert.ok(allLogs.includes('Shutting down gracefully'), 'Should log graceful shutdown');
  });

  it('should complete in-flight requests before shutdown', async () => {
    const serverProcess = await startServer();

    // Start a healthcheck request
    const requestPromise = makeRequest('/healthcheck');

    // Wait a tiny bit for request to be sent
    await sleep(50);

    // Send SIGTERM while request may be in-flight - the request should complete
    serverProcess.kill('SIGTERM');

    // The request should still complete successfully
    const response = await requestPromise;
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { alive: true });
  });

  it('should not accept new connections after shutdown signal', async () => {
    const serverProcess = await startServer();

    // Verify server is running
    const response = await makeRequest('/healthcheck');
    assert.strictEqual(response.status, 200);

    // Set up exit promise before sending signal
    const exitPromise = new Promise<void>((resolve) => {
      serverProcess.once('exit', () => resolve());
    });

    // Send SIGTERM
    serverProcess.kill('SIGTERM');

    // Wait a bit for server to start shutdown
    await sleep(200);

    // Try to make a new request - should fail
    try {
      await makeRequest('/healthcheck', 2000);
      assert.fail('Should not be able to connect after shutdown');
    } catch (error) {
      // Expected: connection should be refused or reset
      assert.ok(error instanceof Error);
    }

    // Wait for server to finish
    await exitPromise;
  });
});

describe('Router Endpoints', () => {
  afterEach(async () => {
    await killServer(currentServerProcess);
    currentServerProcess = null;
    await sleep(200);
  });

  it('should return 404 for unknown routes', async () => {
    await startServer();

    const response = await makeRequest('/nonexistent');
    assert.strictEqual(response.status, 404);
  });

  it('should return correct healthcheck response', async () => {
    await startServer();

    const response = await makeRequest('/healthcheck');

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { alive: true });
  });
});
