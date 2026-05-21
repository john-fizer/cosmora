/**
 * Cosmora Playwright driver — for agent use only.
 *
 * Usage:
 *   node .claude/skills/run-cosmora/driver.mjs [command] [url-path]
 *
 * Commands:
 *   screenshot [path]   Navigate to path, take screenshot → ./ss-<slug>.png
 *   smoke               GET /, /dashboard, /dashboard/oracle, /dashboard/report, /dashboard/transits
 *   default (no args)   same as smoke
 */

import { chromium } from 'playwright';
import { existsSync } from 'fs';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 1440, height: 900 };

function slug(path) {
  return path.replace(/\//g, '-').replace(/^-/, '') || 'home';
}

async function withPage(fn) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

const [,, cmd = 'smoke', arg = ''] = process.argv;

if (cmd === 'screenshot') {
  const path = arg || '/';
  await withPage(async (page) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const file = `ss-${slug(path)}.png`;
    await page.screenshot({ path: file });
    console.log(`✓ screenshot saved → ${file}`);
  });
} else {
  // smoke: visit all key routes
  const routes = [
    '/',
    '/dashboard',
    '/dashboard/oracle',
    '/dashboard/report',
    '/dashboard/transits',
  ];
  await withPage(async (page) => {
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      const file = `ss-${slug(route)}.png`;
      await page.screenshot({ path: file });
      console.log(`✓ ${route} → ${file}`);
    }
  });
  console.log('Smoke done.');
}
