import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = join(fileURLToPath(import.meta.url), '..', '..', 'fixtures');

export async function setupFixtures(page) {
  await page.route('**/data/index.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      elections: [{ slug: 'test-2026', label: 'Test Election 2026', date: '2026-11-04' }]
    })
  }));

  await page.route('**/data/**', async route => {
    const url = new URL(route.request().url());
    const rel = url.pathname.replace(/^\/data\//, '');
    const filePath = join(FIXTURES, rel);
    try {
      const body = readFileSync(filePath);
      await route.fulfill({ contentType: 'application/json', body });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
}
