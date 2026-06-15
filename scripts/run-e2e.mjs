import { spawn } from 'node:child_process';

const HOST = '127.0.0.1';
const FRONTEND_URL = `http://${HOST}:5174`;
const API_URL = `http://${HOST}:3002`;
const API_TOKEN = 'e2e-test-token';
const E2E_ENV = {
  ...process.env,
  PORT: '3002',
  ALLOWED_ORIGIN: FRONTEND_URL,
  VITE_API_URL: API_URL,
  VITE_API_TOKEN: API_TOKEN,
  TREE_API_TOKEN: API_TOKEN,
  TEST_DB: './tests/e2e/e2e-test-db.json',
};

const serverCommands = [
  {
    name: 'frontend',
    command: process.execPath,
    args: ['./node_modules/vite/bin/vite.js', '--host', HOST, '--port', '5174', '--strictPort'],
  },
  {
    name: 'api',
    command: process.execPath,
    args: ['--import', 'tsx', 'server.ts'],
  },
];

const servers = [];

const waitForUrl = async (url, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Server is still booting.
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const stopProcessTree = child => new Promise(resolve => {
  if (!child.pid || child.killed) {
    resolve();
    return;
  }

  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    killer.on('exit', () => resolve());
    killer.on('error', () => resolve());
    return;
  }

  child.kill('SIGTERM');
  child.once('exit', () => resolve());
  setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL');
    resolve();
  }, 2500).unref();
});

const stopServers = async () => {
  await Promise.all(servers.map(stopProcessTree));
};

const stopAndExit = async exitCode => {
  await stopServers();
  process.exit(exitCode);
};

process.on('SIGINT', () => void stopAndExit(130));
process.on('SIGTERM', () => void stopAndExit(143));

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, options);

  child.on('error', reject);
  child.on('exit', code => resolve(code ?? 1));
});

try {
  for (const { name, command, args } of serverCommands) {
    const server = spawn(command, args, {
      env: E2E_ENV,
      stdio: 'inherit',
    });
    server.on('error', error => {
      console.error(`${name} server failed to start: ${error.message}`);
      void stopAndExit(1);
    });
    servers.push(server);
  }

  await Promise.all([
    waitForUrl(FRONTEND_URL),
    waitForUrl(`${API_URL}/api/tree`),
  ]);

  const exitCode = await run(
    process.execPath,
    ['./node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
    {
      env: E2E_ENV,
      stdio: 'inherit',
    },
  );

  await stopAndExit(exitCode);
} catch (error) {
  console.error(error);
  await stopAndExit(1);
}
