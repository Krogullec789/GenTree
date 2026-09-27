import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

// Serve the production build under the same project prefix as GitHub Pages.
const root = path.resolve('dist');
const prefix = '/GenTree/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
  const file = path.resolve(root, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
  if (!file.startsWith(root + path.sep)) { response.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (request.url().includes('/api/')) failures.push('Demo attempted an API request'); });
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
  await expect(page.getByText('Demo · Twoja sesja')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toHaveText('Zapisano');
  await expect(page.locator('.app-logo')).toBeVisible();
  expect(await page.locator('.app-logo').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: 'Otwórz profil: Jan Kowalski', exact: true }).click();
  const name = page.getByLabel('Imię', { exact: true });
  await name.fill('');
  await name.press('Tab');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toContainText('Podaj imię');
  await mkdir('output/playwright', { recursive: true });
  await page.screenshot({ path: 'output/playwright/profile-validation-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/profile-validation-mobile.png' });
  await page.getByRole('button', { name: 'Zamknij panel' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Otwórz profil: Jan Kowalski', exact: true }).click();
  await expect(name).toHaveValue('Jan');
  await name.fill('Demo produkcyjne');
  await page.getByLabel('Imię', { exact: true }).press('Tab');
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toHaveText('Zapisano');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Otwórz profil: Demo produkcyjne Kowalski' })).toBeVisible();
  expect(failures).toEqual([]);
  console.log('Production demo verified under /GenTree/: assets, isolated storage, invalid draft protection, edit/save/reload, no API requests.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
