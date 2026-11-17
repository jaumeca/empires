/**
 * Story events e2e: an employee raises an idea (their portrait, their name),
 * the choice is applied and remembered with them in the Story, the decision
 * pauses the game and keyboard digits answer it, and a pending event survives
 * save/load.
 * Usage: node tools/e2e/events.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-events';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  const closeCards = async () => { for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); } };
  await page.goto(`${base}/?fresh&debug&seed=92`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => {
    const g = window.__empires.game; const s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' });
    s.company.money = 60000; s.contracts.completed = 1;
    let ok = false;
    for (let z = 0; z < s.office.d && !ok; z++) for (let x = 0; x < s.office.w && !ok; x++) for (const rot of [0, 1, 2, 3]) if (!ok) ok = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: 'H-ev', name: 'Iris', appearance: { skin: 3, hairStyle: 2, hairColor: 6, top: 2, topColor: 7, pantsColor: 1, accessory: 2 }, baseSkills: { tech: 4, design: 6, creativity: 7, management: 4 }, trait: 'curious', salary: 450, expiresDay: 99 });
    g.dispatch({ type: 'hire', candidateId: 'H-ev' });
    g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
  });
  await closeCards();
  await page.click('[data-speed="1"]');
  await page.waitForTimeout(400);
  const raised = await page.evaluate(() => window.__empires.forceEvent('team_idea'));
  await page.waitForTimeout(1600);
  let s = await st();
  const iris = s.empirians[1];
  check('an employee raises an idea', raised && s.pendingDecision?.kind === 'team_idea' && s.pendingDecision.speakerId === iris.id);
  check('the game pauses for the decision', s.pendingDecision && (await page.evaluate(() => window.__empires.game.clock.speed)) === 0);
  const cardText = await page.textContent('.card');
  check('the card speaks with their voice and shows the options', cardText.includes('Iris') && /Adelante|Go for it/.test(cardText), cardText.slice(0, 160));
  check('…and the employee raises a hand in the office', await page.evaluate((id) => window.__empires.game.state.empirians.find((e) => e.id === id).activity === 'raising_hand', iris.id));
  await page.screenshot({ path: path.join(out, 'team-idea.png') });

  // Save with the question pending, reload, answer with the keyboard.
  await page.evaluate(() => window.__empires.ui.save?.());
  await page.click('#hud-menu').catch(() => {});
  await page.click('text=Guardar ahora').catch(() => {});
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  s = await st();
  check('a pending story event survives save/load', s.pendingDecision?.kind === 'team_idea' && s.pendingDecision.speakerId === iris.id);
  for (let i = 0; i < 3 && !(await page.isVisible('.card .option, .card [data-option]')); i++) await page.waitForTimeout(300);
  const ceil0 = s.projects[0].ceilingMods.length;
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  s = await st();
  const mem = s.story.memories[s.story.memories.length - 1];
  check('digit 1 adopts the idea (more ceiling, more morale)', !s.pendingDecision && s.projects[0].ceilingMods.length === ceil0 + 1);
  check('it is remembered in the Story with them', mem.text.key === 'ledger.event.team_idea.adopt' && (mem.empirianIds || []).includes(iris.id));
  await closeCards();
  await page.click(`[data-speed="0"]`).catch(() => {});
  await page.evaluate((id) => window.__empires.ui.showEmpirian(id), iris.id);
  await page.waitForTimeout(400);
  check('…and appears on their character sheet', /idea de Iris|Iris's idea/.test(await page.textContent('.card')));
  await page.screenshot({ path: path.join(out, 'sheet-memory.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
