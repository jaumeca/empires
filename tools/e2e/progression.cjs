/**
 * Progression e2e (D-062): a brand-new studio starts small (few buttons, a
 * simple first game), unlocks arrive at real milestones with a friendly note,
 * a small celebration and a Story memory; the new buttons appear (with a
 * "new" dot); an old save keeps everything; phone layout works too.
 * Usage: node tools/e2e/progression.cjs http://localhost:4173 <outDir>
 */
const { chromium, devices } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-progression';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  const closeCards = async () => { for (let i = 0; i < 6 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(200); } };
  await page.goto(`${base}/?fresh&debug&seed=102`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(600);

  // 1. The start: only what matters.
  check('the office starts with one clear action (no contracts, no newspaper, no team)', (await page.isVisible('#hud-new-project')) && !(await page.isVisible('#hud-contracts')) && !(await page.isVisible('#hud-news')) && !(await page.isVisible('#hud-team')));
  check('Decorate, Help (menu), pause and speeds are always there', (await page.isVisible('#hud-decor')) && (await page.isVisible('#hud-menu')) && (await page.isVisible('[data-speed="0"]')));
  await page.click('#hud-new-project');
  await page.waitForTimeout(400);
  const simple = await page.evaluate(() => ({ features: document.querySelectorAll('button.feature').length, locked: document.querySelectorAll('.card .locked').length, prototype: !!document.getElementById('np-prototype'), inputs: document.querySelectorAll('.card input[type=range]').length }));
  check('the first game asks only for name, topic, focus and deadline (no padlocks)', simple.features === 0 && simple.locked === 0 && !simple.prototype && simple.inputs === 2, JSON.stringify(simple));
  check('…and one line says what comes next', /primer juego|first game/.test(await page.textContent('#np-next')));
  await page.click('#start-project');
  await closeCards();

  // 2. First unlock while making the first game: better equipment.
  const seen = [];
  await page.evaluate(() => { window.__unlocks = []; window.__empires.game.onUpdate((ev) => { for (const e of ev) if (e.type === 'unlock') window.__unlocks.push(e.unlockId); }); });
  for (let i = 0; i < 60 && !(await page.evaluate(() => window.__unlocks.includes('equipment'))); i++) await page.evaluate(() => window.__empires.play(4));
  await page.waitForTimeout(500);
  const note = await page.textContent('.toast.unlock').catch(() => '');
  check('first unlock (equipment) comes with a short, friendly note', /Nuevo|New/.test(note) && /Decorar|Decorate/.test(note), note.slice(0, 120));
  await page.screenshot({ path: path.join(out, 'unlock-equipment.png') });
  let s = await st();
  check('…remembered in the Story', s.story.memories.some((m) => m.text.key === 'memory.unlock.equipment'));
  await page.keyboard.press('d'); await page.waitForTimeout(300);
  check('…and Decorate now offers computers and chairs', await page.isVisible('[data-cat="computer"]'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // 3. First launch: planning and the newspaper.
  await page.evaluate(() => { const g = window.__empires.game; for (let i = 0; i < 20000 && g.state.activeProjectId; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[0].id }); else g.tick(); } for (let i = 0; i < 8; i++) g.tick(); });
  await page.waitForTimeout(2500);
  await closeCards();
  s = await st();
  check('the first launch unlocks planning and the newspaper', s.progress.seen.includes('planning') && s.progress.seen.includes('newspaper'));
  check('the newspaper button appears, marked as new', (await page.isVisible('#hud-news')) && (await page.evaluate(() => document.getElementById('hud-news').classList.contains('fresh'))));
  await page.screenshot({ path: path.join(out, 'after-first-launch.png') });
  for (let i = 0; i < 6 && !(await page.isVisible('#start-project')); i++) { await closeCards(); if (await page.isVisible('#hud-new-project')) await page.click('#hud-new-project'); await page.waitForTimeout(500); }
  const planned = await page.evaluate(() => ({ features: document.querySelectorAll('button.feature').length, locked: document.querySelectorAll('button.feature.locked').length, ranges: document.querySelectorAll('.card input[type=range]').length }));
  check('the second game can set price, budget and features (still no padlocks)', planned.features >= 2 && planned.locked === 0 && planned.ranges === 3, JSON.stringify(planned));
  await closeCards();

  // 4. Clients call after the first sales.
  await page.evaluate(() => window.__empires.play(8 * 9));
  await page.waitForTimeout(400);
  await closeCards();
  check('after the first sales, client contracts appear', (await st()).progress.seen.includes('contracts') && (await page.isVisible('#hud-contracts')));

  // 5. Save/load keeps progress.
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  const before = (await st()).progress;
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  check('progress survives save/load', JSON.stringify((await st()).progress) === JSON.stringify(before));

  // 6. An old save (v1 fixture with a released game) keeps everything, silently.
  const fixture = require('fs').readFileSync(path.join(__dirname, '../../tests/fixtures/save-v1-released.empires'), 'utf8');
  await page.evaluate((txt) => { localStorage.setItem('empires.debug.save.auto', txt); }, fixture);
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(2000);
  s = await st();
  check('an old save opens with what it had already reached (no notes for old progress)', s.progress.seen.includes('planning') && (await page.isVisible('#hud-news')) && !(await page.isVisible('.toast.unlock')), JSON.stringify(s.progress.seen));

  // 7. Phone: the simplified start fits.
  const phone = await browser.newPage({ ...devices['iPhone 13 landscape'] });
  phone.on('pageerror', (e) => errors.push('phone: ' + e.message));
  await phone.goto(`${base}/?fresh&debug&seed=103`);
  await phone.waitForTimeout(1500);
  await phone.click('#start-game');
  await phone.waitForTimeout(500);
  await phone.click('#hud-new-project');
  await phone.waitForTimeout(400);
  const fits = await phone.evaluate(() => { const b = document.getElementById('start-project').getBoundingClientRect(); return b.bottom <= window.innerHeight + 1 && b.right <= window.innerWidth + 1; });
  check('on a phone the first game dialog fits and can be started', fits);
  await phone.screenshot({ path: path.join(out, 'phone-first-game.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
