// Screenshot of the founder working at the desk (seated) for visual review.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:5173/?fresh&debug&seed=7&cam=' + (process.argv[3] || 'dim')); await p.waitForTimeout(1500);
  await p.click('#start-game'); await p.waitForTimeout(500);
  await p.click('#hud-new-project'); await p.waitForTimeout(300);
  await p.click('#start-project'); await p.waitForTimeout(300);
  await p.click('[data-speed="1"]');
  await p.evaluate(() => window.__empires.advance(30));
  await p.waitForTimeout(6000);
  await p.screenshot({ path: out });
  await b.close();
})();
