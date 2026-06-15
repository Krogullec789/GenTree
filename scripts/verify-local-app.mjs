import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { validateTreeData } from '../src/utils/treeData.ts';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const DEFAULT_API_URL = 'http://localhost:3001';
const BOOT_TIMEOUT_MS = 30_000;

export const parseDotEnv = (raw) => {
  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');
    values[key] = value;
  }

  return values;
};

export const personLabel = (node) =>
  `${node.firstName || ''} ${node.lastName || ''}`.trim();

export const isIgnoredBrowserError = (error) =>
  error.url?.includes('fonts.googleapis.com') ||
  error.url?.includes('fonts.gstatic.com');

const loadLocalEnv = (cwd) => {
  const envFile = path.join(cwd, '.env');
  if (!fs.existsSync(envFile)) return {};
  return parseDotEnv(fs.readFileSync(envFile, 'utf8'));
};

const createRuntimeConfig = (cwd) => {
  const localEnv = loadLocalEnv(cwd);
  const mergedEnv = { ...process.env, ...localEnv };
  const frontendUrl = mergedEnv.ALLOWED_ORIGIN || DEFAULT_FRONTEND_URL;
  const apiUrl = mergedEnv.VITE_API_URL || DEFAULT_API_URL;
  const apiToken = mergedEnv.VITE_API_TOKEN || mergedEnv.TREE_API_TOKEN || mergedEnv.API_TOKEN || '';

  return {
    cwd,
    frontendUrl,
    apiUrl,
    apiToken,
    dbFile: mergedEnv.TEST_DB || path.join(cwd, 'db.json'),
    env: {
      ...mergedEnv,
      ALLOWED_ORIGIN: frontendUrl,
      VITE_API_URL: apiUrl,
      VITE_API_TOKEN: apiToken,
      TREE_API_TOKEN: mergedEnv.TREE_API_TOKEN || apiToken,
      PORT: mergedEnv.PORT || '3001',
    },
  };
};

const readAndValidateTree = (dbFile) => {
  const document = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const validation = validateTreeData(document);

  if (!validation.valid) {
    throw new Error(`db.json is invalid:\n${validation.errors.join('\n')}`);
  }

  const nodes = Object.values(validation.data.nodes);
  const edges = Object.values(validation.data.edges);

  if (nodes.length === 0) {
    throw new Error('db.json is valid, but it has no people to render.');
  }

  return {
    document,
    data: validation.data,
    nodes,
    edges,
  };
};

const collectRepresentativeNames = (nodes, maxCount = 6) =>
  [...nodes]
    .sort((a, b) => a.y - b.y || a.x - b.x || personLabel(a).localeCompare(personLabel(b)))
    .map(personLabel)
    .filter(Boolean)
    .slice(0, maxCount);

const startServer = ({ name, command, args, env, cwd }) => {
  const logs = [];
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout.on('data', chunk => logs.push(chunk.toString()));
  child.stderr.on('data', chunk => logs.push(chunk.toString()));

  return { name, child, logs };
};

const stopProcess = async (child) => {
  if (!child.pid || child.killed || child.exitCode !== null) return;

  await new Promise(resolve => {
    const timeout = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // Process already exited.
      }
      resolve();
    }, 1_500);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      child.kill('SIGTERM');
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
};

const waitForUrl = async (url, options = {}, timeoutMs = BOOT_TIMEOUT_MS) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, options);
      if (response.status < 500) return response;
    } catch {
      // Server is still booting.
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const verifyBrowserFlow = async ({ frontendUrl, apiUrl, apiToken, tree }) => {
  const browser = await chromium.launch({ headless: true });
  const browserErrors = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
    page.on('console', message => {
      if (message.type() !== 'error') return;
      browserErrors.push({ text: message.text(), url: message.location().url });
    });
    page.on('pageerror', error => {
      browserErrors.push({ text: error.message, url: '' });
    });

    const apiResponse = await waitForUrl(`${apiUrl}/api/tree`, {
      headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
    });
    const apiTree = await apiResponse.json();

    await page.goto(frontendUrl, { waitUntil: 'networkidle' });
    await page.locator('.person-node').first().waitFor({ timeout: 10_000 });

    const representativeNames = collectRepresentativeNames(tree.nodes);
    for (const name of representativeNames) {
      await page.getByText(name).first().waitFor({ state: 'visible', timeout: 5_000 });
    }

    const renderedNodes = await page.locator('.person-node').count();
    const firstName = representativeNames[0];
    await page.getByText(firstName).first().click();
    await page.getByRole('heading', { name: 'Profil osoby' }).waitFor({ timeout: 5_000 });

    const openedProfile = `${await page.locator('#firstName').inputValue()} ${await page.locator('#lastName').inputValue()}`.trim();
    const unexpectedErrors = browserErrors.filter(error => !isIgnoredBrowserError(error));

    if (Object.keys(apiTree.nodes || {}).length !== tree.nodes.length) {
      throw new Error(`API returned ${Object.keys(apiTree.nodes || {}).length} nodes, expected ${tree.nodes.length}.`);
    }

    if (Object.keys(apiTree.edges || {}).length !== tree.edges.length) {
      throw new Error(`API returned ${Object.keys(apiTree.edges || {}).length} edges, expected ${tree.edges.length}.`);
    }

    if (renderedNodes !== tree.nodes.length) {
      throw new Error(`UI rendered ${renderedNodes} nodes, expected ${tree.nodes.length}.`);
    }

    if (openedProfile !== firstName) {
      throw new Error(`Opened profile "${openedProfile}", expected "${firstName}".`);
    }

    if (unexpectedErrors.length > 0) {
      throw new Error(`Unexpected browser errors:\n${JSON.stringify(unexpectedErrors, null, 2)}`);
    }

    return {
      apiNodes: tree.nodes.length,
      apiEdges: tree.edges.length,
      renderedNodes,
      checkedNames: representativeNames,
      openedProfile,
      ignoredExternalErrors: browserErrors.length - unexpectedErrors.length,
    };
  } finally {
    await browser.close();
  }
};

export const runVerification = async (cwd = process.cwd()) => {
  const config = createRuntimeConfig(cwd);
  const tree = readAndValidateTree(config.dbFile);
  const servers = [
    startServer({
      name: 'frontend',
      command: process.execPath,
      args: ['./node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5173', '--strictPort'],
      cwd: config.cwd,
      env: config.env,
    }),
    startServer({
      name: 'api',
      command: process.execPath,
      args: ['--env-file=.env', '--import', 'tsx', 'server.ts'],
      cwd: config.cwd,
      env: config.env,
    }),
  ];

  try {
    await waitForUrl(config.frontendUrl);
    const summary = await verifyBrowserFlow({
      frontendUrl: config.frontendUrl,
      apiUrl: config.apiUrl,
      apiToken: config.apiToken,
      tree,
    });

    return {
      dbFile: path.relative(cwd, config.dbFile),
      ...summary,
    };
  } catch (error) {
    for (const server of servers) {
      console.error(`--- ${server.name} logs ---`);
      console.error(server.logs.join('').trim() || '(no output)');
    }

    throw error;
  } finally {
    await Promise.all(servers.map(server => stopProcess(server.child)));
  }
};

const isMainModule = () => {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
};

if (isMainModule()) {
  runVerification()
    .then(summary => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch(error => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
