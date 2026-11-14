// F1.10: stress scene with N extra Empirians; prints renderer stats.
// Usage: node tools/e2e/stress.cjs <baseUrl> <N> [screenshot]
const { chromium } = require('playwright');
(async () => {
  const [base, n = '10', out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`${base}/?fresh&debug&seed=3&stress=${n}`); await p.waitForTimeout(1500);
  await p.click('#start-game'); await p.waitForTimeout(6000);
  const stats = await p.evaluate(() => {
    const s = window.__empires.scene.stats();
    return new Promise((res) => { let f = 0; const t0 = performance.now(); const loop = () => { if (++f < 120) requestAnimationFrame(loop); else res({ ...s, fps: (f * 1000) / (performance.now() - t0), mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null }); }; requestAnimationFrame(loop); });
  });
  console.log(JSON.stringify(stats));
  if (out) await p.screenshot({ path: out });
  await b.close();
})();
