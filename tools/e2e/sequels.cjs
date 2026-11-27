/**
 * Sequels e2e (0.23.0, D-073): a game people liked can have a sequel from the
 * new-game dialog — same world (topic), a numbered name, fans waiting — and
 * the sequel is judged against the original when it comes out.
 * Usage: node tools/e2e/sequels.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-sequels';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const closeAll = async () => { for (let i = 0; i < 6 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(250); } };
  await page.goto(`${base}/?fresh&debug&seed=33`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const E = window.__empires, g = E.game, s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' }); E.unlockAll(); s.company.money = 60000;
    const play = (name, topicId, score) => {
      g.dispatch({ type: 'start_project', name, topicId, size: 'small', focus: 0.6, budget: 500, days: 35, price: 9.99 });
      for (let i = 0; i < 30000 && g.state.activeProjectId; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1].id }); else E.advance(1); }
      s.projects.find((p) => p.name === name).result.averageScore = score;
    };
    play('Turbo', 'kart', 8.1); play('Gris', 'robots', 5.2);
  });
  await page.waitForTimeout(800);
  await closeAll();
  await page.evaluate(() => { window.__empires.ui.setSpeed(0); window.__empires.ui.showNewProject(); });
  await page.waitForTimeout(400);
  const offered = await page.evaluate(() => [...document.querySelectorAll('[data-sequel]')].map((b) => b.textContent));
  check('the new-game dialog offers a sequel of the game people liked (not of the flop)', offered.length === 1 && /Turbo/.test(offered[0]), JSON.stringify(offered));
  check('…with how many fans are waiting', /fans/i.test(offered[0] ?? ''));
  await page.click('[data-sequel]');
  await page.waitForTimeout(300);
  const planned = await page.evaluate(() => ({ topic: document.querySelector('.tile.on')?.dataset.topic, name: document.querySelector('.card input[type=text]')?.value, on: !!document.querySelector('[data-sequel].on') }));
  check('…tapping it sets the same world and a numbered name', planned.topic === 'kart' && planned.name === 'Turbo 2' && planned.on, JSON.stringify(planned));
  await page.evaluate(() => document.getElementById('np-sequels')?.scrollIntoView());
  await page.screenshot({ path: path.join(out, 'sequel-dialog.png') });
  await page.click('[data-topic="pirates"]');
  await page.waitForTimeout(200);
  check('…changing the world un-picks it', !(await page.isVisible('[data-sequel].on')));
  await page.click('[data-sequel]');
  await page.click('#start-project');
  await page.waitForTimeout(400);
  const started = await page.evaluate(() => { const s = window.__empires.game.state; const p = s.projects.find((q) => q.id === s.activeProjectId); const o = s.projects.find((q) => q.name === 'Turbo'); return { sequelOf: p?.sequelOf === o.id, fans: p?.sequelFans, name: p?.name }; });
  check('the sequel starts, linked to its original, with fans waiting', started.sequelOf && started.fans > 0 && started.name === 'Turbo 2', JSON.stringify(started));
  await page.evaluate(() => window.__empires.ui.showNewProject());
  await page.waitForTimeout(300);
  await closeAll();
  // Out it comes: the original is the bar (here a very high one).
  const verdict = await page.evaluate(() => {
    const E = window.__empires, g = E.game, s = g.state;
    s.projects.find((q) => q.name === 'Turbo').result.averageScore = 9.7;
    for (let i = 0; i < 30000 && g.state.activeProjectId; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1].id }); else E.advance(1); }
    const p = s.projects.find((q) => q.name === 'Turbo 2');
    return { keys: p.result.explanation.map((id) => s.ledger.find((l) => l.id === id)?.text.key), saga: s.story.memories.some((m) => m.kind === 'saga') };
  });
  check('critics compare it with the original (explained in the results) and the saga is remembered', verdict.keys.includes('factor.sequel_letdown') && verdict.saga, JSON.stringify(verdict));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
