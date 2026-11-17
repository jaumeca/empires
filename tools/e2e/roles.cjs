/**
 * Roles e2e (AW.E.2): the team card offers a role per person, the tester tests
 * while the other builds, the mix hint appears, automatic split resets, save/load.
 * Usage: node tools/e2e/roles.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-roles';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=91`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => { const g = window.__empires.game; g.dispatch({ type: 'tutorial', action: 'skip' }); g.state.company.money = 60000; });

  // Solo: no roles section.
  await page.keyboard.press('t'); await page.waitForTimeout(300);
  check('solo founder: no role picker yet', !(await page.isVisible('.roles')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  const hired = await page.evaluate(() => {
    const g = window.__empires.game; const s = g.state;
    let ok = false;
    for (let z = 0; z < s.office.d && !ok; z++) for (let x = 0; x < s.office.w && !ok; x++) for (const rot of [0, 1, 2, 3]) if (!ok) ok = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.contracts.completed = 1;
    s.hiring.candidates.push({ id: 'H-e2e', name: 'Tess', appearance: { skin: 2, hairStyle: 3, hairColor: 4, top: 1, topColor: 5, pantsColor: 2, accessory: 1 }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 4 }, trait: 'curious', salary: 450, expiresDay: 99 });
    return g.dispatch({ type: 'hire', candidateId: 'H-e2e' }).ok;
  });
  check('a second person joins', hired);
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await page.keyboard.press('t'); await page.waitForTimeout(300);
  check('the team card shows who does what', await page.isVisible('.roles') && (await page.locator('.role-row').count()) === 2);
  const empId = (await st()).empirians[1].id;
  await page.click(`[data-role-of="${empId}"] [data-role="test"]`);
  await page.waitForTimeout(300);
  let s = await st();
  check('picking Testing assigns the role', s.empirians[1].role === 'test' && (await page.isVisible(`[data-role-of="${empId}"] [data-role="test"].on`)));
  await page.screenshot({ path: path.join(out, 'roles.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // Build: the tester tests while the founder builds.
  await page.evaluate(() => window.__empires.game.dispatch({ type: 'start_project', name: 'Roles', topicId: 'pirates', size: 'small', focus: 0.5, budget: 1500, days: 42, price: 9.99 }));
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  let seenTesting = false;
  for (let i = 0; i < 400 && !seenTesting; i++) {
    seenTesting = await page.evaluate((id) => {
      const g = window.__empires.game;
      if (g.state.pendingDecision) { const d = g.state.pendingDecision; g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[0].id }); }
      else g.tick();
      const p = g.state.projects.find((x) => x.id === g.state.activeProjectId);
      return p?.phase === 'production' && g.state.empirians.find((e) => e.id === id).activity === 'testing';
    }, empId);
  }
  check('during production the tester is testing', seenTesting);
  await page.evaluate(() => { for (let i = 0; i < 40; i++) { const g = window.__empires.game; const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[0].id }); else g.tick(); } });
  for (let i = 0; i < 4 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(200); }
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await page.keyboard.press('t'); await page.waitForTimeout(300);
  check('the card explains the current mix', await page.isVisible('#roles-mix'), await page.evaluate(() => { const s = window.__empires.game.state; const p = s.projects.find((x) => x.id === s.activeProjectId); return JSON.stringify(p && { ph: p.phase, w: p.workDone }); }));
  await page.click(`.member[data-member="${empId}"]`); await page.waitForTimeout(300);
  check('the character sheet shows the role', /Pruebas|Testing/.test(await page.textContent('.card')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // Save/load keeps the role; automatic split resets it.
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  s = await st();
  check('the role survives save/load', s.empirians[1].role === 'test');
  await page.keyboard.press('t'); await page.waitForTimeout(300);
  await page.click('#roles-auto'); await page.waitForTimeout(300);
  s = await st();
  check('automatic split puts everyone back on auto', s.empirians.every((e) => !e.role) && (await page.isDisabled('#roles-auto')));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
