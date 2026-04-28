import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/#/test-2026/compare/council-1-test?a=carol-council-test&b=dave-council-test');
});

test('shows two candidate names', async ({ page }) => {
  await expect(page.locator('.compare-col-name').nth(0)).toContainText('Carol');
  await expect(page.locator('.compare-col-name').nth(1)).toContainText('Dave');
});

test('shows field labels', async ({ page }) => {
  await expect(page.locator('.compare-field-label').first()).toBeVisible();
});

test('left prev button is disabled when at first candidate', async ({ page }) => {
  await expect(page.locator('.compare-nav-btn').nth(0)).toBeDisabled();
});

test('right next button cycles to next candidate', async ({ page }) => {
  // Right column shows Dave (index 1 of 3). Next → Eve.
  await page.locator('.compare-nav-btn').nth(3).click(); // right col's next
  await expect(page.locator('.compare-col-name').nth(1)).toContainText('Eve');
});

test('pin button locks left candidate while right cycles', async ({ page }) => {
  await page.locator('.pin-btn').first().click();
  await expect(page.locator('.pin-btn').first()).toHaveClass(/pinned/);
  // Cycle right col
  await page.locator('.compare-nav-btn').nth(3).click();
  // Left should still be Carol
  await expect(page.locator('.compare-col-name').nth(0)).toContainText('Carol');
});

test('shows compare progress', async ({ page }) => {
  await expect(page.locator('.compare-progress')).toBeVisible();
});
