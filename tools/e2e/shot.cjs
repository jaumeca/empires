// Usage: node tools/e2e/shot.cjs <url> <out.png> [width] [height] [waitMs]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w = '1280', h = '720', wait = '2500'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  console.log(logs.join('\n'));
  await browser.close();
})();
