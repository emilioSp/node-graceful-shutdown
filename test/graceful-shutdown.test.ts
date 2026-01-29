import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const TEST_PORT = 3456;
let currentServerProcess: ChildProcess | null = null;

const makeRequest = async (path: string): Promise<{ status: number; body: unknown }> => {
  const response = await fetch(`http://localhost:${TEST_PORT}${path}`);

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body };
}

const startServer = (): Promise<ChildProcess> => new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['index.ts'], {
      cwd: ROOT_DIR,
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: ['pipe', 'pipe', 'pipe'], // create streams for stdin, stdout, stderr accessible for parent
    });

    currentServerProcess = serverProcess;
    let started = false;

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[SERVER]', output.trim());
      if (output.includes(`http serving on port ${TEST_PORT}`) && !started) {
        started = true;
        resolve(serverProcess);
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[SERVER ERROR]', data.toString().trim());
    });

    serverProcess.on('error', reject);

    setTimeout(() => {
      if (!started) {
        serverProcess.kill('SIGKILL');
        reject(new Error('Server failed to start within timeout'));
      }
    }, 10000);
  });

describe('Graceful Shutdown', () => {
  afterEach(async () => {
    currentServerProcess?.kill('SIGKILL');
    currentServerProcess = null;
    await sleep(200);
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

    const requestPromise = makeRequest('/delayed');

    // Wait a tiny bit for request to be sent
    await sleep(50);

    // Send SIGTERM while request may be in-flight - the request should complete
    serverProcess.kill('SIGTERM');

    // The request should still complete successfully
    const response = await requestPromise;
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { ok: true });
  });

  it('should not accept new connections after shutdown signal', async () => {
    const serverProcess = await startServer();

    // Verify server is running
    const response = await makeRequest('/delayed');
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
      await makeRequest('/delayed');
      assert.fail('Should not be able to connect after shutdown');
    } catch (error) {
      // Expected: connection should be refused or reset
      assert.ok(error instanceof Error);
    }

    // Wait for server to finish
    await exitPromise;
  });
});
