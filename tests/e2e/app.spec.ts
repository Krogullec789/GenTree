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
  await page.getByLabel('Imię', { exact: true }).press('Tab');
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
  await page.getByLabel('Imię', { exact: true }).press('Tab');
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
  await page.getByLabel('Imię', { exact: true }).press('Tab');
  await saved(page);
  await second.getByLabel('Imię', { exact: true }).fill('Anna');
  await second.getByLabel('Imię', { exact: true }).press('Tab');
  await expect(second.getByRole('status', { name: 'Stan zapisu' })).toContainText('Drzewo zmieniło się w innym oknie');
  await second.getByLabel('Imię', { exact: true }).fill('Aneta');
  await second.getByLabel('Imię', { exact: true }).press('Tab');
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
  await page.getByLabel('Imię', { exact: true }).press('Tab');
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
  await page.getByLabel('Imię', { exact: true }).press('Tab');
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

for (const mode of ['api', 'demo']) {
  test(`${mode}: invalid drafts preserve saved data and a long field edit is one undo step`, async ({ page }) => {
    await page.goto(mode === 'demo' ? '/?demo' : '/');
    await openJan(page);
    const name = page.getByLabel('Imię', { exact: true });
    await name.fill('');
    await name.press('Tab');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toContainText('Podaj imię');
    await page.getByRole('button', { name: 'Zamknij panel' }).click();
    await page.reload();
    await openJan(page);
    await expect(name).toHaveValue('Jan');
    const birth = page.getByLabel('Data ur.');
    const death = page.getByLabel('Data śm.');
    await birth.fill('1980-01-01');
    await birth.press('Tab');
    await saved(page);
    await death.fill('1970-01-01');
    await death.press('Tab');
    await expect(death).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toContainText('Data śmierci nie może być wcześniejsza');
    await death.fill('2020-01-01');
    await death.press('Tab');
    await saved(page);

    await name.fill('Anna');
    await name.press('Tab');
    await saved(page);
    const bio = page.getByLabel('Biografia');
    const originalBio = await bio.inputValue();
    await bio.fill('');
    const text = 'Długi życiorys zawiera ponad pięćdziesiąt znaków i pozostaje jednym krokiem historii.';
    await bio.pressSequentially(text);
    await bio.press('Tab');
    await saved(page);
    await page.getByRole('button', { name: 'Cofnij zmianę' }).click();
    await expect(bio).toHaveValue(originalBio);
    await expect(name).toHaveValue('Anna');
    await page.getByRole('button', { name: 'Cofnij zmianę' }).click();
    await expect(name).toHaveValue('Jan');
    await page.getByRole('button', { name: 'Ponów zmianę' }).click();
    await page.getByRole('button', { name: 'Ponów zmianę' }).click();
    await expect(bio).toHaveValue(text);
    await saved(page);
    await page.reload();
    await page.getByRole('button', { name: 'Otwórz profil: Anna Kowalski', exact: true }).click();
    await expect(bio).toHaveValue(text);
  });
}

test('adding a relative is atomic and a rejected third parent leaves no extra person', async ({ page, request }) => {
  await page.goto('/');
  await openJan(page);
  const addParent = page.getByRole('button', { name: 'Dodaj nową osobę jako parent' });
  await addParent.click();
  await expect(page.locator('.person-node')).toHaveCount(2);
  await page.getByRole('button', { name: 'Cofnij zmianę' }).click();
  await expect(page.locator('.person-node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ponów zmianę' }).click();
  await expect(page.locator('.person-node')).toHaveCount(2);
  await addParent.click();
  await saved(page);
  const before = await (await request.get(api, { headers })).json();
  await addParent.click();
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toContainText('more than two parents');
  await expect(page.locator('.person-node')).toHaveCount(3);
  await page.getByRole('button', { name: 'Cofnij zmianę' }).click();
  await expect(page.locator('.person-node')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ponów zmianę' }).click();
  await saved(page);
  const after = await (await request.get(api, { headers })).json();
  expect(after.nodes).toEqual(before.nodes);
  expect(after.edges).toEqual(before.edges);
});

test('malformed array imports identify the entry and leave the current tree intact', async ({ page }) => {
  await page.goto('/');
  await saved(page);
  const file = page.getByLabel('Plik drzewa JSON');
  for (const nodes of [[null], [seed.nodes.jan, seed.nodes.jan]]) {
    await file.setInputFiles({ name: 'bad-array.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ nodes, edges: [] })) });
    await expect(page.getByRole('status', { name: 'Stan zapisu' })).toContainText(`nodes[${nodes.length - 1}]`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.person-node')).toHaveCount(1);
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'Otwórz profil: Jan Kowalski', exact: true })).toBeVisible();
});
