/**
 * Kinds of project e2e (D.4 / D-060): the plan shows whether the game is indie
 * or ambitious (same dialog, no separate modes), and contract offers show the
 * client's history with the studio.
 * Usage: node tools/e2e/profiles.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-profiles';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const closeCards = async () => { for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); } };
  await page.goto(`${base}/?fresh&debug&seed=97`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => { const g = window.__empires.game; g.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.unlockAll() /* this suite tests the mechanic, not when it unlocks (D-062) */; g.state.company.money = 50000; });
  await page.keyboard.press('p'); await page.waitForTimeout(400);
  check('a small game by a solo founder is shown as indie', /Indie/.test(await page.textContent('#np-profile')));
  await page.screenshot({ path: path.join(out, 'plan-indie.png') });
  // Medium with two features → ambitious.
  await page.locator('.seg button', { hasText: /^(Mediano|Medium)/ }).first().click();
  await page.waitForTimeout(200);
  const feats = page.locator('[data-feature]:not([disabled])');
  const n = await feats.count();
  for (let i = 0, picked = 0; i < n && picked < 2; i++) { await feats.nth(i).click(); picked = await page.evaluate(() => document.querySelectorAll('button.feature.on').length); }
  await page.waitForTimeout(200);
  const amb = await page.textContent('#np-profile').catch(() => '');
  check('a medium game with two features is shown as ambitious', /ambicioso|Ambitious/i.test(amb), amb);
  await page.screenshot({ path: path.join(out, 'plan-ambitious.png') });
  await closeCards();
  // Contracts: a client the studio already served shows it.
  await page.evaluate(() => {
    const s = window.__empires.game.state;
    s.contracts.clients = { museum: { jobs: 3, trust: 6 }, gym: { jobs: 1, trust: -4 } };
    s.contracts.offers = [
      { id: 'C-a', clientId: 'museum', kind: 'website', focus: 0.5, work: 80, days: 20, payment: 3000, expiresDay: 99 },
      { id: 'C-b', clientId: 'gym', kind: 'website', focus: 0.5, work: 80, days: 20, payment: 2500, expiresDay: 99 },
    ];
    window.__empires.ui.showContracts?.();
  });
  if (!(await page.isVisible('.offer'))) { await page.keyboard.press('c'); await page.waitForTimeout(400); }
  const loyal = await page.textContent('[data-client-rel="museum"]').catch(() => '');
  const wary = await page.textContent('[data-client-rel="gym"]').catch(() => '');
  check('offers show a regular client and one who remembers a bad job', /habitual|Regular/.test(loyal) && /mal encargo|bad job/.test(wary), `${loyal} / ${wary}`);
  await page.screenshot({ path: path.join(out, 'contract-clients.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
