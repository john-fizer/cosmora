import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
await p.waitForTimeout(4500);
await p.screenshot({ path: 'j0.png' });
for (const [name, frac] of [['j1',0.25],['j2',0.5],['j3',0.75],['j4',0.99]]) {
  await p.evaluate(f => window.scrollTo(0, (document.body.scrollHeight - window.innerHeight) * f), frac);
  await p.waitForTimeout(2800);
  await p.screenshot({ path: name + '.png' });
}
await b.close();
console.log('done');
