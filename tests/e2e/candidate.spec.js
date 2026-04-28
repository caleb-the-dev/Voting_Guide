import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/#/test-2026/candidate/alice-mayor-test');
});

test('shows candidate name and party', async ({ page }) => {
  await expect(page.locator('.cand-name')).toContainText('Alice Johnson');
  await expect(page.locator('.cand-meta')).toContainText('Democratic');
});

test('shows summary section', async ({ page }) => {
  await expect(page.locator('.dossier-section').filter({ hasText: 'Summary' })).toBeVisible();
});

test('shows track record with sources', async ({ page }) => {
  const section = page.locator('.dossier-section').filter({ hasText: 'Track Record' });
  await expect(section).toBeVisible();
  await expect(section.locator('.source-link').first()).toBeVisible();
});

test('shows stated positions', async ({ page }) => {
  await expect(page.locator('.dossier-section').filter({ hasText: 'Stated Positions' })).toBeVisible();
});

test('shows pick button', async ({ page }) => {
  await expect(page.locator('button.btn-primary')).toContainText('Pick');
});

test('pick button updates to picked state', async ({ page }) => {
  await page.locator('button.btn-primary').click();
  await expect(page.locator('button.btn-primary')).toContainText('✓ Picked');
});

test('back button returns to race page', async ({ page }) => {
  await page.locator('a.btn-secondary').first().click();
  await expect(page).toHaveURL(/race\/mayor-test/);
});
