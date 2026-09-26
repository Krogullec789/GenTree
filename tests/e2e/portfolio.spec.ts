import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

test('capture the fictional demo for the portfolio', async ({ browser }) => {
  test.skip(process.env.CAPTURE_PORTFOLIO !== 'true', 'Run npm run demo:capture to regenerate media.');
  await fs.mkdir('docs/media', { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: 'output/playwright/video', size: { width: 1440, height: 900 } },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5174/?demo');
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toHaveText('Zapisano');
  await page.getByRole('button', { name: 'Pokaż całe drzewo' }).click();
  await page.screenshot({ path: 'docs/media/gentree-desktop.png' });
  // Deliberate short pauses make the exported product tour readable.
  await page.waitForTimeout(1400);
  await page.getByRole('button', { name: 'Otwórz profil: Jan Kowalski', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Dodaj nową osobę jako child' }).click();
  await page.getByRole('button', { name: 'Zamknij panel' }).click();
  await page.getByRole('button', { name: 'Ułóż drzewo automatycznie' }).click();
  await page.getByRole('button', { name: 'Pokaż całe drzewo' }).click();
  await page.waitForTimeout(1400);
  await page.getByRole('button', { name: 'Cofnij zmianę' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Ponów zmianę' }).click();
  await expect(page.getByRole('status', { name: 'Stan zapisu' })).toHaveText('Zapisano');
  await page.waitForTimeout(1400);
  await context.close();
  await page.video()!.saveAs('docs/media/gentree-tour.webm');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto('http://127.0.0.1:5174/?demo');
  await expect(mobilePage.getByRole('status', { name: 'Stan zapisu' })).toHaveText('Zapisano');
  await mobilePage.getByRole('button', { name: 'Pokaż całe drzewo' }).tap();
  await mobilePage.screenshot({ path: 'docs/media/gentree-mobile.png' });
  await mobile.close();
});
