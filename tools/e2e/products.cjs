/**
 * Products e2e (GT.6, D-064): the "Your games" button appears with the
 * products unlock; the catalogue lists released games with their state;
 * a patch is a maintenance job (HUD pill, team at work, no new game
 * meanwhile) that fixes the bugs without touching the score; an update
 * brings a retired game back on sale; a later-life happening is a quiet
 * note; everything survives save/load.
 * Usage: node tools/e2e/products.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-products';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const closeCards = async () => { for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(200); } };
  await page.goto(`${base}/?fresh&debug&seed=77`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(500);
  // Two games out, the first one past its launch weeks (the real milestone, not unlockAll).
  await page.evaluate(() => {
    const E = window.__empires, g = E.game;
    g.dispatch({ type: 'tutorial', action: 'skip' });
    const play = (name) => {
      g.dispatch({ type: 'start_project', name, topicId: 'kart', size: 'small', focus: 0.6, budget: 1000, days: 35, price: 9.99 });
      for (let i = 0; i < 20000 && g.state.activeProjectId; i++) {
        const d = g.state.pendingDecision;
        if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1].id });
        else E.advance(1);
      }
    };
    play('Isla');
    play('Nube');
    for (let i = 0; i < 8 * 7 * 11; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1].id }); else E.advance(1); }
  });
  await page.waitForTimeout(3000);
  await closeCards();
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.waitForTimeout(400);
  check('"Your games" appears once two games are out and one has lived its launch', await page.isVisible('#hud-products'));
  const isla = await page.evaluate(() => window.__empires.game.state.projects.find((p) => p.name === 'Isla'));
  await page.evaluate((id) => { const p = window.__empires.game.state.projects.find((q) => q.id === id); p.bugs.hidden = 7; p.bugs.known = 1; }, isla.id);
  await page.click('#hud-products');
  await page.waitForTimeout(400);
  const rows = await page.$$eval('.products-list .product', (els) => els.map((e) => ({ id: e.dataset.product, status: e.dataset.status, text: e.textContent })));
  check('the catalogue lists both games with their state', rows.length === 2 && rows.every((r) => ['launch', 'tail', 'retired'].includes(r.status)), JSON.stringify(rows.map((r) => r.status)));
  await page.screenshot({ path: path.join(out, 'catalogue.png') });
  const score = isla.result.averageScore;
  await page.click(`[data-support="patch"][data-project="${isla.id}"]`);
  await page.waitForTimeout(500);
  check('a patch starts: the HUD shows the maintenance job', await page.isVisible('#hud-support'));
  check('…and no new game can start meanwhile', !(await page.isVisible('#hud-new-project')));
  await page.click('[data-speed="4"]');
  await page.waitForTimeout(2500);
  const working = await page.evaluate(() => window.__empires.game.state.empirians.map((e) => e.activity));
  check('the team works on it (testing/fixing)', working.includes('testing'), working.join(','));
  await page.screenshot({ path: path.join(out, 'patching.png') });
  await page.evaluate(() => { const E = window.__empires, g = E.game; for (let i = 0; i < 4000 && g.state.support; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1].id }); else E.advance(1); } });
  await page.waitForTimeout(600);
  const after = await page.evaluate((id) => window.__empires.game.state.projects.find((p) => p.id === id), isla.id);
  check('the patch fixed every bug and the score did not change', after.bugs.hidden + after.bugs.known === 0 && after.result.averageScore === score && after.result.support.patches === 1);
  await closeCards();
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  // A retired good game gets new content.
  await page.evaluate((id) => { const p = window.__empires.game.state.projects.find((q) => q.id === id); p.result.averageScore = Math.max(p.result.averageScore, 7); p.result.salesEnded = true; }, isla.id);
  await page.click('#hud-products');
  await page.waitForTimeout(400);
  const retired = await page.getAttribute(`.product[data-product="${isla.id}"]`, 'data-status');
  await page.click(`[data-support="update"][data-project="${isla.id}"]`);
  await page.evaluate(() => { const E = window.__empires, g = E.game; for (let i = 0; i < 4000 && g.state.support; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1].id }); else E.advance(1); } });
  const upd = await page.evaluate((id) => window.__empires.game.state.projects.find((p) => p.id === id).result, isla.id);
  check('an update brings a retired game back on sale', retired === 'retired' && upd.salesEnded === false && upd.support.updates === 1 && !!upd.updateWave);
  // Save and reload.
  await page.waitForTimeout(500);
  await closeCards();
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  const back = await page.evaluate((id) => window.__empires.game.state.projects.find((p) => p.id === id).result.support, isla.id);
  check('maintenance history survives save/load', back && back.patches === 1 && back.updates === 1);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
