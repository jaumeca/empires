/**
 * Bigger studio e2e (AW.E.1): expand from the decoration bar, keep everything,
 * fit and hire a bigger team, nobody walks through furniture, save/load.
 * Usage: node tools/e2e/expansion.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-expansion';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=90`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => { const g = window.__empires.game; g.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.unlockAll(); /* tests the mechanic, not when it unlocks (D-062) */ g.state.company.money = 80000; });
  const before = await st();
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  await page.click('#decor-expand');
  await page.waitForTimeout(300);
  check('expansion offer explains space, people, rent', /14×10/.test(await page.textContent('.card.expand')) && /alquiler|Rent/i.test(await page.textContent('.card.expand')));
  await page.click('#expand-confirm');
  await page.waitForTimeout(800);
  let s = await st();
  check('paid and bigger', s.office.size === 'studio' && s.office.w === 14 && s.company.money === 80000 - 25000);
  check('every item kept in place', JSON.stringify(s.office.items) === JSON.stringify(before.office.items));
  check('the room is rebuilt bigger', await page.evaluate(() => window.__empires.scene.shellDims === '14x10'));
  await page.screenshot({ path: path.join(out, 'studio.png') });

  // Build a bigger team: desks + hires.
  const team = await page.evaluate(() => {
    const g = window.__empires.game;
    const s = g.state;
    let desks = 0;
    for (let z = 0; z < s.office.d && desks < 4; z++) for (let x = 0; x < s.office.w && desks < 4; x++) for (const rot of [0, 1, 2, 3]) if (desks < 4 && g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok) desks++;
    s.contracts.completed = 1;
    const traits = ['sociable', 'curious', 'perfectionist', 'night_owl'];
    let hired = 0;
    traits.forEach((trait, i) => {
      s.hiring.candidates.push({ id: `H-x${i}`, name: `P${i}`, appearance: { skin: i, hairStyle: i + 1, hairColor: i + 2, top: i % 5, topColor: i + 3, pantsColor: i % 6, accessory: i % 6 }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 4 }, trait, salary: 450, expiresDay: 99 });
      if (g.dispatch({ type: 'hire', candidateId: `H-x${i}` }).ok) hired++;
    });
    g.dispatch({ type: 'start_project', name: 'Big', topicId: 'kart', size: 'medium', focus: 0.7, budget: 3000, days: 98, price: 14.99 });
    return { desks, hired, people: s.empirians.length };
  });
  check('four more desks fit and four people are hired (5 in the studio)', team.desks === 4 && team.hired === 4 && team.people === 5, JSON.stringify(team));
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await page.click('[data-speed="1"]');
  const hits = [];
  for (let i = 0; i < 60; i++) {
    for (let j = 0; j < 4 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); j++) { await page.keyboard.press('1'); await page.waitForTimeout(150); }
    const r = await page.evaluate(() => {
      const { game, scene } = window.__empires;
      const W = game.state.office.w;
      return [...scene.actors.entries()].filter(([, a]) => a.path.length > 0).map(([id, a]) => {
        const cx = Math.floor(a.pos[0] / 6), cz = Math.floor(a.pos[1] / 6), tx = Math.floor(a.target.x / 6), tz = Math.floor(a.target.z / 6);
        return scene.blocked[cx + cz * W] && !(cx === tx && cz === tz) ? id : null;
      }).filter(Boolean);
    });
    hits.push(...r);
    await page.waitForTimeout(100);
  }
  check('everyone moves on walkable floor in the bigger studio', hits.length === 0, hits.slice(0, 3).join(','));
  await page.click('[data-speed="0"]');
  await page.screenshot({ path: path.join(out, 'studio-team.png') });
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  s = await st();
  check('the studio and the team survive save/load', s.office.size === 'studio' && s.empirians.length === 5 && (await page.evaluate(() => window.__empires.scene.shellDims)) === '14x10');
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
