/**
 * External contracts e2e (LS.8): offers appear, accept with a touch tap, the
 * contract pill shows progress, the job gets delivered and paid.
 * Usage: node tools/e2e/contracts.cjs http://localhost:4173 <screenshotDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-e2e';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=5`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(400);
  // Let the first weekly refresh happen (day 3).
  await page.evaluate(() => window.__empires.advance(8 * 4));
  await page.waitForTimeout(500);
  let s = await st();
  check('offers available after a few days', s.contracts.offers.length > 0, String(s.contracts.offers.length));
  check('contracts button visible with badge', await page.isVisible('#hud-contracts .badge'));

  await page.tap('#hud-contracts');
  await page.waitForTimeout(400);
  check('offers list opens', (await page.locator('.offer').count()) === s.contracts.offers.length);
  await page.screenshot({ path: path.join(out, 'contracts-offers.png') });
  const offer = s.contracts.offers[0];
  const money0 = s.company.money;
  await page.tap(`[data-accept="${offer.id}"]`);
  await page.waitForTimeout(400);
  s = await st();
  check('contract accepted', s.contracts.active && s.contracts.active.id === offer.id);
  check('contract pill shown', await page.isVisible('#hud-contract'));
  check('new project button hidden while busy', !(await page.isVisible('#hud-new-project')));
  await page.evaluate(() => window.__empires.advance(8 * 3));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'contracts-working.png') });
  s = await st();
  check('founder works on the contract', s.contracts.active && s.contracts.active.done > 0, s.contracts.active ? String(Math.round(s.contracts.active.done)) : '-');

  await page.evaluate(() => window.__empires.advance(8 * 60));
  await page.waitForTimeout(600);
  s = await st();
  check('contract delivered and paid', !s.contracts.active && s.contracts.completed === 1 && s.company.money > money0, `money ${money0} → ${s.company.money}`);
  await page.screenshot({ path: path.join(out, 'contracts-done.png') });

  await page.click('[data-speed="0"]');
  await page.click('#hud-menu');
  await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  s = await st();
  check('contract history persists after reload', s.contracts.completed === 1);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
