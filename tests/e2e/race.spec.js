import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/#/test-2026/race/mayor-test');
});

test('shows position info before candidates', async ({ page }) => {
  await expect(page.locator('.position-info')).toBeVisible();
  await expect(page.locator('.position-info')).toContainText('Mayor');
  await expect(page.locator('.position-info')).toContainText('responsibilities');
});

test('shows position responsibility text', async ({ page }) => {
  await expect(page.locator('.position-info')).toContainText('chief executive');
});

test('shows candidate cards', async ({ page }) => {
  await expect(page.locator('.candidate-card')).toHaveCount(2);
});

test('candidate cards show name and party', async ({ page }) => {
  const first = page.locator('.candidate-card').first();
  await expect(first.locator('.cand-name')).toContainText('Alice Johnson');
  await expect(first.locator('.cand-meta')).toContainText('Democratic');
});

test('candidate card has view profile link', async ({ page }) => {
  const first = page.locator('.candidate-card').first();
  await expect(first.locator('a[href*="candidate"]')).toBeVisible();
});

test('candidate card has compare checkbox', async ({ page }) => {
  await expect(page.locator('.candidate-card input[type="checkbox"]').first()).toBeVisible();
});

test('compare button appears when two candidates checked', async ({ page }) => {
  await page.locator('.candidate-card input[type="checkbox"]').nth(0).check();
  await page.locator('.candidate-card input[type="checkbox"]').nth(1).check();
  await expect(page.locator('.btn-compare')).toBeVisible();
});
