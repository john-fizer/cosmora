import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const OUT = 'C:/Users/John/.claude/jobs/4bddf133';
const VIEWPORT = { width: 1440, height: 900 };

const routes = [
  ['home', '/'],
  ['onboarding', '/onboarding'],
  ['dashboard', '/dashboard'],
  ['chart', '/dashboard/chart'],
  ['briefing', '/dashboard/briefing'],
  ['transits', '/dashboard/transits'],
  ['timeline', '/dashboard/timeline'],
  ['insights', '/dashboard/insights'],
  ['oracle', '/dashboard/oracle'],
  ['report', '/dashboard/report'],
  ['electional', '/dashboard/electional'],
  ['solar-return', '/dashboard/solar-return'],
  ['compatibility', '/dashboard/compatibility'],
  ['settings', '/dashboard/settings'],
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

for (const [name, route] of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/audit-${name}.png` });
  console.log(`✓ ${name}`);
}

await browser.close();
console.log('Done.');
