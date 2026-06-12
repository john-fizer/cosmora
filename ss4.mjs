import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo(0,0));
await page.waitForTimeout(500);

const heroTextDiv = await page.$('.flex.flex-col.items-center.justify-center.px-6.pt-32');
let styles = null;
if (heroTextDiv) {
  styles = await page.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return { paddingTop: cs.paddingTop, topRect: el.getBoundingClientRect().top };
  }, heroTextDiv);
}

console.log('styles:', JSON.stringify(styles));

const outDir = 'C:\\Users\\John\\.claude\\jobs\\4bddf133';
await page.screenshot({ path: outDir + '\\hero-fixed-desktop.png', clip: {x:0,y:0,width:1280,height:900} });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo(0,0));
await page.waitForTimeout(300);
await page.screenshot({ path: outDir + '\\hero-fixed-mobile.png', clip: {x:0,y:0,width:390,height:844} });

await browser.close();
