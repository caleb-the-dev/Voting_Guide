import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/');
});

test('shows race list for single election', async ({ page }) => {
  // Single election → auto-loaded, race list shown
  await expect(page.locator('.races')).toBeVisible();
  await expect(page.locator('.race-row')).toHaveCount(2);
});

test('race rows show title and pill', async ({ page }) => {
  const firstRow = page.locator('.race-row').first();
  await expect(firstRow.locator('.race-link')).toContainText('Mayor');
  await expect(firstRow.locator('.pill')).toBeVisible();
});

test('shows progress count', async ({ page }) => {
  await expect(page.locator('.progress')).toContainText('of 2 races decided');
});

test('picks link is visible', async ({ page }) => {
  await expect(page.locator('a[href*="picks"]')).toBeVisible();
});
