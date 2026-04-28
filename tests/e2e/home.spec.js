import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test('home loads without error', async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/');
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('.error')).toHaveCount(0);
});
