/**
 * Scope idea e2e (F3.2 / D-058): mid-production the founder proposes adding a
 * fitting feature; adding it with more time moves the date, and it shows in
 * the project and the Story.
 * Usage: node tools/e2e/scope.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-scope';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=95`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  const found = await page.evaluate(() => {
    const g = window.__empires.game; const s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' }); s.eventLog.lastDay = 1e9;
    g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1000, days: 42, price: 9.99 });
    for (let i = 0; i < 20000 && s.activeProjectId; i++) {
      const d = s.pendingDecision;
      if (d && d.kind === 'scope_idea') return true;
      if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'polish_plan' ? 'balanced' : d.kind === 'big_idea' ? 'keep' : d.options[0].id });
      else g.tick();
    }
    return false;
  });
  await page.waitForTimeout(1600);
  check('mid-production, an idea to add a fitting feature', found);
  const card = await page.textContent('.card');
  check('…explained in words, with three different options', /Historia|Story/.test(card) && (await page.locator('.card .option').count()) === 3, card.slice(0, 120));
  await page.screenshot({ path: path.join(out, 'scope-idea.png') });
  let s = await st();
  const dl = s.projects[0].deadlineDay;
  await page.keyboard.press('2');
  await page.waitForTimeout(400);
  s = await st();
  check('adding it with more time: feature in, date moved a week', s.projects[0].features.includes('story') && s.projects[0].deadlineDay === dl + 7);
  check('…and it is in the Story', s.story.memories.some((m) => m.text.key === 'ledger.moment.scope_idea.add_time'));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
