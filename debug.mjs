import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', e => errors.push(e.message));

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);

// Get computed padding of hero text div
const heroTextDiv = await page.$('.flex.flex-col.items-center.justify-center.px-6.pt-32');
let styles = null;
if (heroTextDiv) {
  styles = await page.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return { paddingTop: cs.paddingTop, top: el.getBoundingClientRect().top };
  }, heroTextDiv);
}

console.log('styles:', JSON.stringify(styles));
console.log('errors:', JSON.stringify(errors.slice(0,5)));

await browser.close();
