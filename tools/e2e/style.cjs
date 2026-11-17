/**
 * Walls & floor e2e (AW.C.3): preview a finish in the office before paying,
 * leaving decoration reverts it, applying charges once and persists.
 * Usage: node tools/e2e/style.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-style';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  const shellKey = () => page.evaluate(() => window.__empires.scene.shellKey);
  await page.goto(`${base}/?fresh&debug&seed=70`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => { const g = window.__empires.game; g.dispatch({ type: 'tutorial', action: 'skip' }); g.state.company.money = 5000; });
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  await page.click('[data-cat="style"]');
  await page.waitForTimeout(200);
  check('walls & floor tab with finishes', (await page.locator('[data-wall]').count()) === 5 && (await page.locator('[data-floor]').count()) === 4);
  await page.click('[data-wall="mint"]');
  await page.click('[data-floor="tiles"]');
  await page.waitForTimeout(300);
  check('preview shows the finish in the office before paying', (await shellKey()) === 'mint|tiles' && (await st()).company.money === 5000);
  await page.screenshot({ path: path.join(out, 'style-preview.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('leaving decoration reverts the preview', (await shellKey()) === 'cream|oak');
  await page.keyboard.press('d');
  await page.click('[data-cat="style"]');
  await page.click('[data-wall="lavender"]');
  await page.click('[data-floor="walnut"]');
  await page.click('#style-apply');
  await page.waitForTimeout(300);
  let s = await st();
  check('apply charges wall + floor once', s.company.money === 5000 - 150 - 300 && s.office.style.wall === 'lavender' && s.office.style.floor === 'walnut', String(s.company.money));
  check('the room keeps the new finish', (await shellKey()) === 'lavender|walnut', await shellKey());
  await page.screenshot({ path: path.join(out, 'style-applied.png') });
  await page.keyboard.press('Escape');
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  check('finish survives save and reload', (await shellKey()) === 'lavender|walnut');
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
