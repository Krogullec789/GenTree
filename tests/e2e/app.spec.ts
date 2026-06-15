import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('GenTree E2E Tests', () => {
  test.beforeAll(() => {
    const dbPath = path.join(process.cwd(), 'tests', 'e2e', 'e2e-test-db.json');
    fs.writeFileSync(dbPath, JSON.stringify({ nodes: [], edges: [] }, null, 2));
  });

  test.afterAll(() => {
    const dbPath = path.join(process.cwd(), 'tests', 'e2e', 'e2e-test-db.json');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  test('should load the page and render GenTree header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=GenTree')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Premium Family Tree')).toBeVisible();
  });

  test('should open the profile panel for the generated root person', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Jan Kowalski')).toBeVisible({ timeout: 10000 });
    await page.getByText('Jan Kowalski').click();

    await expect(page.getByRole('heading', { name: 'Profil osoby' })).toBeVisible();
    await expect(page.getByLabel('Imię')).toHaveValue('Jan');
  });
});
