/**
 * Desktop-first e2e (web): keyboard shortcuts and mouse placement in decoration
 * mode, at common desktop resolutions. Usage: node tools/e2e/desktop.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-desktop';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  const speed = () => page.evaluate(() => window.__empires.game.clock.speed);
  await page.goto(`${base}/?fresh&debug&seed=8`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => window.__empires.unlockAll()); // tests the mechanic, not when it unlocks (D-062)
  await page.evaluate(() => { window.__empires.game.state.company.money = 20000; });
  await page.waitForTimeout(300);

  await page.keyboard.press('3');
  check('key 3 sets 4x speed', (await speed()) === 4);
  await page.keyboard.press(' ');
  check('space pauses', (await speed()) === 0);
  await page.keyboard.press(' ');
  check('space resumes at the previous speed', (await speed()) === 4);
  await page.keyboard.press(' ');

  await page.keyboard.press('n');
  check('N opens Empires Daily', await page.isVisible('.daily'));
  await page.screenshot({ path: path.join(out, 'desk-daily-side.png') });
  await page.keyboard.press('Escape');
  check('Esc closes the dialog', !(await page.isVisible('.backdrop')));

  await page.keyboard.press('d');
  check('D opens decoration mode', await page.isVisible('.decor-sheet'));
  await page.click('[data-cat="plant"]');
  await page.click('[data-buy="plant_tall"]');
  const cell = await page.evaluate(() => window.__empires.scene.cellScreenPos(0, 6));
  await page.mouse.move(cell.x, cell.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'desk-ghost-hover.png') });
  await page.mouse.click(cell.x, cell.y);
  await page.waitForTimeout(400);
  let s = await st();
  check('mouse: hover + click places the item there', s.office.items.some((i) => i.defId === 'plant_tall' && i.x === 0 && i.z === 6));

  await page.click('[data-cat="comfort"]');
  await page.click('[data-buy="sofa"]');
  await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  check('Esc cancels the placement (nothing bought)', !(await st()).office.items.some((i) => i.defId === 'sofa'));
  await page.keyboard.press('Escape');
  check('Esc leaves decoration mode', !(await page.isVisible('.decor-sheet')));

  await page.keyboard.press('p');
  check('P opens the new project dialog', await page.isVisible('#start-project'));
  await page.screenshot({ path: path.join(out, 'desk-new-project.png') });
  await page.click('#start-project');
  for (let i = 0; i < 300 && !(await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) await page.evaluate(() => window.__empires.advance(20));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(out, 'desk-decision-side.png') });
  const d = (await st()).pendingDecision;
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  s = await st();
  check('number key answers the decision', d && !s.pendingDecision && s.projects[0].decisionsTaken.some((x) => x.endsWith(':' + d.options[0].id)), d ? `${d.kind} → ${d.options[0].id}` : 'no decision');

  for (const [w, h] of [[1366, 768], [1280, 720], [2560, 1440]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    await page.keyboard.press('p');
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => { const c = document.querySelector('.backdrop .card'); if (!c) return null; const r = c.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
    check(`${w}×${h}: dialog fits on screen`, !!box && box.top >= 0 && box.bottom <= box.h + 1, box ? `${Math.round(box.top)}–${Math.round(box.bottom)} / ${box.h}` : 'none');
    await page.screenshot({ path: path.join(out, `desk-${w}x${h}.png`) });
    await page.keyboard.press('Escape');
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
