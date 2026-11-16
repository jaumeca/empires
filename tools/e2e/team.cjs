/**
 * Team e2e (GT.1): applicants arrive, a desk is needed, hire, the new Empirian
 * sits at their own desk and works, then let go. Mouse + keyboard (desktop).
 * Usage: node tools/e2e/team.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-team';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=12`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  check('no team button before shipping anything', !(await page.isVisible('#hud-team')));
  // Pretend a contract was delivered (unlocks hiring) and let a day pass.
  await page.evaluate(() => { const s = window.__empires.game.state; s.contracts.completed = 1; s.company.money = 30000; });
  await page.evaluate(() => window.__empires.advance(8 * 2));
  await page.waitForTimeout(500);
  let s = await st();
  check('applicants arrive', s.hiring.candidates.length === 3, String(s.hiring.candidates.length));
  check('team button with badge', await page.isVisible('#hud-team .badge'));

  await page.keyboard.press('t');
  await page.waitForTimeout(400);
  check('T opens the team card', await page.isVisible('.card.team'));
  check('hire disabled without a free desk', await page.isDisabled('[data-hire]'));
  await page.screenshot({ path: path.join(out, 'team-need-desk.png') });
  await page.click('#team-buy-desk');
  await page.waitForTimeout(300);
  check('shortcut to decoration mode', await page.isVisible('.decor-sheet'));
  await page.click('[data-cat="desk"]');
  await page.click('[data-buy="desk_basic"]');
  let placed = false;
  for (const [cx, cz] of [[6, 4], [5, 4], [6, 5], [4, 6], [6, 6], [1, 6], [7, 3]]) {
    const cell = await page.evaluate(([x, z]) => window.__empires.scene.cellScreenPos(x, z), [cx, cz]);
    await page.mouse.move(cell.x, cell.y);
    await page.waitForTimeout(250);
    if (await page.isEnabled('#decor-confirm')) { await page.mouse.click(cell.x, cell.y); placed = true; break; }
  }
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  s = await st();
  check('second desk bought', placed && s.office.items.filter((i) => i.defId.startsWith('desk')).length === 2);

  await page.keyboard.press('t');
  await page.waitForTimeout(300);
  const cand = s.hiring.candidates[0];
  await page.click(`[data-hire="${cand.id}"]`);
  await page.waitForTimeout(600);
  s = await st();
  const emp = s.empirians.find((e) => e.id !== s.founderId);
  check('hired', !!emp && emp.name === cand.name && emp.salary === cand.salary, emp ? `${emp.name} ${emp.salary}€/sem ${emp.trait}` : 'none');
  const keys = await page.evaluate(() => [...window.__empires.scene.actors.keys()]);
  check('the new Empirian is in the office', keys.includes(emp.id), keys.join(','));

  // Start a project; the employee works at their own desk.
  await page.keyboard.press('p');
  await page.click('#start-project');
  await page.evaluate(() => window.__empires.advance(8 * 3));
  for (let i = 0; i < 20 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(200); }
  await page.click('[data-speed="1"]');
  await page.waitForTimeout(4000);
  const target = await page.evaluate((id) => window.__empires.scene.actors.get(id).targetName, emp.id);
  s = await st();
  const e2 = s.empirians.find((e) => e.id === emp.id);
  check('employee works at their own desk', target === `seat:${emp.id}` && ['coding', 'designing', 'thinking', 'testing'].includes(e2.activity), `${target} · ${e2.activity}`);
  check('employee gains experience', e2.xp.tech + e2.xp.design > 0);
  await page.click('[data-speed="0"]');
  await page.screenshot({ path: path.join(out, 'team-working.png') });

  // Let go from the Empirian card.
  await page.evaluate((id) => window.__empires.ui.showEmpirian(id), emp.id);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'team-card.png') });
  await page.click('#fire-btn');
  await page.waitForTimeout(600);
  s = await st();
  check('let go: gone from the studio and the office', s.empirians.length === 1 && !(await page.evaluate((id) => window.__empires.scene.actors.has(id), emp.id)));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
