import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.addInitScript(() => {
    localStorage.setItem('vg:test-2026:picks', JSON.stringify({ 'mayor-test': 'alice-mayor-test' }));
    localStorage.setItem('vg:test-2026:notes', JSON.stringify({}));
  });
  await page.goto('http://localhost:8000/app/#/test-2026/picks');
});

test('shows all races', async ({ page }) => {
  await expect(page.locator('.pick-row')).toHaveCount(2);
});

test('shows picked candidate name for decided race', async ({ page }) => {
  const mayorRow = page.locator('.pick-row').filter({ hasText: 'Mayor' });
  await expect(mayorRow.locator('.pick-row-candidate')).toContainText('Alice Johnson');
});

test('shows unpicked label for undecided race', async ({ page }) => {
  const councilRow = page.locator('.pick-row').filter({ hasText: 'Council' });
  await expect(councilRow.locator('.pick-row-unpicked')).toBeVisible();
});

test('notes textarea is visible', async ({ page }) => {
  await expect(page.locator('textarea').first()).toBeVisible();
});

test('export button is present', async ({ page }) => {
  await expect(page.locator('button', { hasText: 'Export' })).toBeVisible();
});

test('import button is present', async ({ page }) => {
  await expect(page.locator('button', { hasText: 'Import' })).toBeVisible();
});

test('print button is present', async ({ page }) => {
  await expect(page.locator('button', { hasText: 'Print' })).toBeVisible();
});
