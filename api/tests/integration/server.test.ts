import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Local API Server Integration', () => {
  let serverProcess: ChildProcess;
  const port = 3002;

  beforeAll(async () => {
    console.log('Starting test server...');
    const apiRoot = path.resolve(__dirname, '../../');
    
    // Use spawn to have more control and handle shell on Windows
    serverProcess = spawn('npm', ['run', 'start:api:local'], {
      cwd: apiRoot,
      env: { 
        ...process.env, 
        CALC_ENVIRONMENT: 'test-local', 
        PORT: port.toString(),
        NODE_ENV: 'test'
      },
      shell: true,
      stdio: 'inherit'
    });

    // Give the server time to start and mount routes
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }, 15000);

  afterAll(() => {
    console.log('Stopping test server...');
    serverProcess.kill();
  });

  it('should be reachable at /api/health', async () => {
    try {
      const response = await fetch(`http://localhost:${port.toString()}/api/health`);
      expect(response.status).toBe(200);
      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toHaveProperty('status');
    } catch (err) {
      console.error('Fetch failed:', err);
      throw err;
    }
  });

  it('should return 404 for unknown routes', async () => {
    const response = await fetch(`http://localhost:${port.toString()}/api/nonexistent-route-for-testing`);
    expect(response.status).toBe(404);
  });
});
