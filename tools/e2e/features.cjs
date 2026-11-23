/**
 * Features & prototype e2e (AW.D.1/D.2): choose features in the new-project
 * dialog (words, locks, slots), the estimate grows, the plan is saved; a hidden
 * problem shows up as a decision with real options.
 * Usage: node tools/e2e/features.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-features';
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
  await page.evaluate(() => { window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.unlockAll(); /* tests the mechanic, not when it unlocks (D-062) */ });
  await page.keyboard.press('p');
  await page.waitForTimeout(300);
  // D-062: only what can be chosen now is shown (no wall of padlocks); one line names the next one and how.
  check('available features with words, locked ones hidden behind one "coming up" line', (await page.locator('[data-feature]').count()) >= 2 && (await page.locator('.feature.locked').count()) === 0 && /Próximamente|Coming up/.test(await page.textContent('#np-next-feature')));
  const est0 = await page.textContent('.card .chip');
  await page.click('[data-topic="pirates"]');
  await page.click('[data-feature="story"]');
  await page.click('[data-feature="customization"]');
  const full = await page.evaluate(() => { const all = [...document.querySelectorAll('.feature')]; return all.filter((b) => b.classList.contains('on')).length === 2 && all.filter((b) => !b.classList.contains('on')).every((b) => b.disabled); });
  check('two slots on a small game (the rest disabled once full)', full);
  await page.check('#np-prototype');
  await page.waitForTimeout(200);
  const est1 = await page.textContent('.card .chip');
  check('the production estimate grows with the extra work', est1 !== est0, `${est0} → ${est1}`);
  await page.screenshot({ path: path.join(out, 'features-dialog.png') });
  await page.click('#start-project');
  await page.waitForTimeout(400);
  let s = await st();
  const p = s.projects[s.projects.length - 1];
  check('the plan keeps the chosen features and the prototype', JSON.stringify(p.features) === '["story","customization"]' && p.prototype === true, JSON.stringify(p.features));

  // Force a hidden problem to check the decision UI (unprototyped path).
  await page.evaluate(() => { const g = window.__empires.game; const pr = g.state.projects[g.state.projects.length - 1]; pr.prototype = false; pr.featureTrouble = ['story']; });
  for (let i = 0; i < 400 && (await page.evaluate(() => window.__empires.game.state.pendingDecision?.kind)) !== 'feature_trouble'; i++) {
    const kind = await page.evaluate(() => window.__empires.game.state.pendingDecision?.kind);
    if (kind) { await page.keyboard.press('1'); await page.waitForTimeout(150); } else await page.evaluate(() => window.__empires.advance(10));
  }
  await page.waitForSelector('[data-option="push"]', { timeout: 5000 }).catch(() => {});
  check('a problem shows up mid-production with three real options', (await page.evaluate(() => window.__empires.game.state.pendingDecision?.kind)) === 'feature_trouble' && (await page.locator('.option').count()) === 3);
  await page.screenshot({ path: path.join(out, 'feature-trouble.png') });
  const req0 = (await st()).projects.slice(-1)[0].requiredPoints;
  await page.click('[data-option="push"]');
  await page.waitForTimeout(300);
  s = await st();
  check('pushing it through costs more work', s.projects.slice(-1)[0].requiredPoints > req0 && s.projects.slice(-1)[0].featureResolved.includes('story'));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
