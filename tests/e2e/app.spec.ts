import { expect, test, type Page } from '@playwright/test';
import type { TreeData } from '../../src/types/tree';

const seed: TreeData = { nodes: { jan: { id: 'jan', firstName: 'Jan', lastName: 'Kowalski', gender: 'male', x: 480, y: 160 } }, edges: {} };
const api = 'http://127.0.0.1:3002/api/tree';
const headers = { Authorization: 'Bearer e2e-test-token' };
const saved = (page: Page) => expect(page.getByRole('status', { name: 'Stan zapisu' }).filter({ hasText: /^Zapisano$/ })).toBeVisible();
const openJan = (page: Page) => page.getByRole('button', { name: 'Otwórz profil: Jan Kowalski', exact: true }).click();

// Each test owns a fresh server snapshot; one worker prevents shared fixture races.
test.beforeEach(async ({ request }) => {
  const current = await (await request.get(api, { headers })).json();
  const response = await request.post(api, { headers: { ...headers, 'If-Match': current.version }, data: seed });
  expect(response.ok()).toBe(true);
});

test('edits, saves and reloads a person using the real API', async ({ page }) => {
  await page.goto('/');
  await openJan(page);
  await page.getByLabel('Imię', { exact: true }).fill('Adam');
  await saved(page);
  await page.reload();
  await page.getByRole('button', { name: 'Otwórz profil: Adam Kowalski' }).click();
  await expect(page.getByLabel('Imię', { exact: true })).toHaveValue('Adam');
});

test('deletes the last person permanently and can start a new tree', async ({ page, request }) => {
  await page.goto('/');
  await openJan(page);
  await page.getByRole('button', { name: 'Usuń osobę Jan Kowalski' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Usuń', exact: true }).click();
  await saved(page);
  expect((await (await request.get(api, { headers })).json()).nodes).toEqual({});
  await page.reload();
  await expect(page.getByRole('button', { name: 'Dodaj pierwszą osobę' })).toBeEnabled();
  await expect(page.locator('.person-node')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dodaj pierwszą osobę' }).click();
  await page.getByLabel('Imię', { exact: true }).fill('Alicja');
  await saved(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Otwórz profil: Alicja Osoba' })).toBeVisible();
});

test('keeps layout coordinates after a handle click and supports drag, undo and redo', async ({ page }) => {
  await page.goto('/');
  await saved(page);
  await page.getByRole('button', { name: 'Ułóż drzewo automatycznie' }).click();
  await saved(page);
  const card = page.locator('.person-node');
  const position = () => card.evaluate(element => ({ x: (element as HTMLElement).style.left, y: (element as HTMLElement).style.top }));
  const arranged = await position();
  const handle = page.getByRole('button', { name: 'Przesuń osobę' });
  await handle.click();
  expect(await position()).toEqual(arranged);
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  const moved = await position();
  expect(moved).not.toEqual(arranged);
  await page.getByRole('button', { name: 'Cofnij zmianę' }).click();
  expect(await position()).toEqual(arranged);
  await page.getByRole('button', { name: 'Ponów zmianę' }).click();
  expect(await position()).toEqual(moved);
  await saved(page);
  await page.reload();
  await expect(card).toBeVisible();
  expect(await position()).toEqual(moved);
});

test('rejects invalid imports and backs up valid replacements', async ({ page }) => {
  await page.goto('/');
  await saved(page);
  const importButton = page.getByRole('button', { name: 'Importuj JSON', exact: true });
  await importButton.focus();
  await expect(importButton).toBeFocused();
  const chooser = page.waitForEvent('filechooser');
  await importButton.press('Enter');
  await chooser;
  const file = page.getByLabel('Plik drzewa JSON');
  await file.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nodes":null}') });
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toContainText('Nieprawidłowy plik');
  await expect(page.locator('.person-node')).toHaveCount(1);
  await file.setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from('{"nodes":{},"edges":{}}') });
  const backup = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: 'Importuj', exact: true }).click();
  expect((await backup).suggestedFilename()).toContain('backup-before-import');
  await saved(page);
  await page.reload();
  await expect(page.locator('.person-node')).toHaveCount(0);
});

test('protects edits in a stale tab and recovers through backup and reload', async ({ page, context }) => {
  const second = await context.newPage();
  await page.goto('/');
  await second.goto('/');
  await openJan(page);
  await openJan(second);
  await page.getByLabel('Imię', { exact: true }).fill('Adam');
  await saved(page);
  await second.getByLabel('Imię', { exact: true }).fill('Anna');
  await expect(second.getByRole('status', { name: 'Stan zapisu' })).toContainText('Drzewo zmieniło się w innym oknie');
  await second.getByLabel('Imię', { exact: true }).fill('Aneta');
  await expect(second.getByRole('status', { name: 'Stan zapisu' })).toContainText('Drzewo zmieniło się w innym oknie');
  await second.getByRole('button', { name: 'Wczytaj wersję serwera' }).click();
  const download = second.waitForEvent('download');
  await second.getByRole('button', { name: 'Pobierz kopię i kontynuuj' }).click();
  await download;
  await expect(second.getByRole('button', { name: 'Otwórz profil: Adam Kowalski' })).toBeVisible();
  await saved(second);
  await second.close();
});

test('retries unsaved edits after a network failure', async ({ page }) => {
  await page.goto('/');
  await openJan(page);
  await page.route('**/api/tree', route => route.request().method() === 'POST' ? route.abort('failed') : route.continue());
  await page.getByLabel('Imię', { exact: true }).fill('Anna');
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toContainText('Nie udało się zapisać');
  await page.unroute('**/api/tree');
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await saved(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Otwórz profil: Anna Kowalski' })).toBeVisible();
});

test('demo stays isolated from the API and other tabs, persists on reload and resets', async ({ page, context }) => {
  const apiRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) apiRequests.push(request.url()); });
  await page.goto('/?demo');
  await openJan(page);
  await page.getByLabel('Imię', { exact: true }).fill('Moje demo');
  await saved(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Otwórz profil: Moje demo Kowalski' })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/?demo');
  await expect(other.getByRole('button', { name: 'Otwórz profil: Jan Kowalski' })).toBeVisible();
  await page.getByRole('button', { name: 'Resetuj demo' }).click();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pobierz kopię i kontynuuj' }).click();
  await backup;
  await expect(page.getByRole('button', { name: 'Otwórz profil: Jan Kowalski' })).toBeVisible();
  await saved(page);
  expect(apiRequests).toEqual([]);
  await other.close();
});

test('mobile toolbar fits and touch controls remain usable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5174/?demo');
  await saved(page);
  await expect(page.getByRole('button', { name: 'Pokaż całe drzewo' })).toBeInViewport();
  await page.getByRole('button', { name: 'Pokaż całe drzewo' }).tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Importuj JSON', exact: true })).toBeInViewport();
  const zoom = page.getByLabel('Powiększenie', { exact: true });
  const before = await zoom.textContent();
  await page.getByRole('button', { name: 'Powiększ', exact: true }).tap();
  await expect(zoom).not.toHaveText(before!);
  const importButton = page.getByRole('button', { name: 'Importuj JSON', exact: true });
  const chooser = page.waitForEvent('filechooser');
  await importButton.tap();
  await chooser;
  await context.close();
});
