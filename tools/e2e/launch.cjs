/**
 * Launch e2e (0.17.0, blocks 1.3, 5 and 0.2): the HUD shows the next natural
 * goal; a launch shows "Now on sale!", then the results with their tier; a
 * decision that arrives right after a launch is never hidden by the results
 * (it used to stay pending and invisible with the game paused: a soft-lock);
 * the results come right after answering it; the UI is not frozen at launch.
 * Usage: node tools/e2e/launch.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-launch';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ui = () => page.evaluate(() => ({ pend: window.__empires.game.state.pendingDecision?.kind ?? null, modal: window.__empires.ui.modalKind, speed: window.__empires.game.clock.speed }));
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ entryTypes: ['longtask'] }); } catch {} });
  await page.goto(`${base}/?fresh&debug&seed=40`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.ui.setSpeed(0); });
  await page.waitForTimeout(400);
  check('the HUD shows the next natural goal (make your first game)', (await page.getAttribute('#hud-goal', 'data-goal')) === 'first_game');
  await page.click('#hud-goal');
  await page.waitForTimeout(300);
  check('…and tapping it opens what it is about', (await ui()).modal === 'new-project');
  await page.click('.card .close');

  // A whole first game, answering decisions; then a studio decision arrives in the same moment as the launch.
  const res = await page.evaluate(() => {
    const E = window.__empires, g = E.game;
    g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    for (let i = 0; i < 20000 && g.state.activeProjectId; i++) {
      const d = g.state.pendingDecision;
      if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[0].id });
      else E.advance(1);
    }
    const p = g.state.projects[0];
    p.bugs.hidden = Math.max(p.bugs.hidden, 6); p.result.releasedDay -= 20; // make the critical-bug event eligible now
    return { released: !g.state.activeProjectId, forced: E.forceEvent('critical_bug'), t: performance.now() };
  });
  check('the game is released and a decision arrives at the same moment', res.released && res.forced);
  await page.waitForTimeout(400);
  check('"Now on sale!" over the office', await page.isVisible('#launch-banner'));
  await page.screenshot({ path: path.join(out, 'launch-banner.png') });
  await page.waitForTimeout(2600);
  let u = await ui();
  check('the decision is on screen (not hidden behind the results)', u.pend === 'critical_bug' && u.modal === 'decision' && (await page.isVisible('.card.decision')), JSON.stringify(u));
  await page.keyboard.press('1');
  await page.waitForTimeout(1200);
  u = await ui();
  check('…after answering it, the results of the launch appear', u.pend === null && /^results:/.test(u.modal) && (await page.isVisible('.card.results .tier-banner')), JSON.stringify(u));
  const tier = await page.getAttribute('.tier-banner', 'data-tier');
  check('the results say how the launch went (tier)', ['flop', 'ok', 'surprise', 'hit'].includes(tier), tier);
  await page.screenshot({ path: path.join(out, 'results-tier.png') });
  // The launch must not freeze the page (it did: 4 s per new icon size, see icons.ts).
  const long = await page.evaluate((t0) => window.__lt.filter(([s, d]) => s > t0 - 100 && d > 1500).length, res.t);
  check('no multi-second freeze around the launch', long === 0, String(long));
  await page.click('.card.results .close');
  await page.waitForTimeout(500);
  u = await ui();
  check('closing the results resumes the game', u.modal === '' && u.speed > 0, JSON.stringify(u));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
