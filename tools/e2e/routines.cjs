/**
 * Living office e2e (AW.B): Empirians take purposeful breaks at the right
 * places, never walk through furniture, react to events, and everything freezes
 * when paused. Usage: node tools/e2e/routines.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-routines';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?fresh&debug&seed=50`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  // A small team with a drink corner, a sofa and a sociable colleague.
  const setup = await page.evaluate(() => {
    const g = window.__empires.game;
    g.dispatch({ type: 'tutorial', action: 'skip' });
    const s = g.state;
    s.company.money = 60000;
    const place = (defId) => { for (let z = 0; z < 8; z++) for (let x = 0; x < 10; x++) for (const rot of [0, 1, 2, 3]) if (g.dispatch({ type: 'buy_item', defId, x, z, rot }).ok) return true; return false; };
    const ok = ['water_cooler', 'desk_basic'].map(place);
    s.contracts.completed = 1;
    s.hiring.candidates.push({ id: 'H-e2e', name: 'Iris', appearance: { skin: 3, hairStyle: 4, hairColor: 8, top: 3, topColor: 2, pantsColor: 4, accessory: 0 }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 5 }, trait: 'sociable', salary: 400, expiresDay: 99 });
    ok.push(g.dispatch({ type: 'hire', candidateId: 'H-e2e' }).ok);
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'medium', focus: 0.7, budget: 3000, days: 98, price: 14.99 });
    for (const e of s.empirians) e.energy = 45;
    return ok;
  });
  check('studio ready (drink corner, second desk, sociable hire)', setup.every(Boolean), JSON.stringify(setup));

  const seen = {};
  const blockedHits = [];
  const answer = async () => { for (let i = 0; i < 5 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(200); } };
  await page.evaluate(() => { window.__routines = []; window.__empires.game.onUpdate((ev) => { for (const e of ev) if (e.type === 'routine') window.__routines.push(e.kind); }); });
  await page.click('[data-speed="1"]');
  for (let i = 0; i < 260; i++) {
    await answer();
    const r = await page.evaluate(() => {
      const { game, scene } = window.__empires;
      const s = game.state;
      const blocked = scene.blocked; const W = s.office.w;
      const rows = [];
      for (const e of s.empirians) {
        const a = scene.actors.get(e.id);
        const cx = Math.floor(a.pos[0] / 6), cz = Math.floor(a.pos[1] / 6);
        const tx = Math.floor(a.target.x / 6), tz = Math.floor(a.target.z / 6);
        const startC = a.path.length ? null : 0;
        rows.push({ id: e.id, act: e.activity, target: a.targetName, moving: a.path.length > 0, onBlocked: !!blocked[cx + cz * W] && !(cx === tx && cz === tz), startC });
      }
      return rows;
    });
    for (const row of r) {
      if (['drinking', 'lounging', 'chatting'].includes(row.act)) (seen[row.act] ??= new Set()).add(row.target.replace(/:.*/, ''));
      if (row.moving && row.onBlocked) blockedHits.push(`${row.id}@${row.target}`);
    }
    if (seen.drinking && seen.chatting) break;
    await page.waitForTimeout(90);
  }
  check('drink break walks to the water cooler', !!seen.drinking && seen.drinking.has('drink'), seen.drinking ? [...seen.drinking].join(',') : 'none');
  const kinds = await page.evaluate(() => window.__routines.join(','));
  check('chat break: the pair meets face to face', !!seen.chatting && seen.chatting.has('chat'), `${seen.chatting ? [...seen.chatting].join(',') : 'none'} · events: ${kinds}`);
  check('nobody walks through furniture', blockedHits.length === 0, blockedHits.slice(0, 3).join(' '));
  await page.screenshot({ path: path.join(out, 'routine.png') });

  // Pause freezes routines too.
  await answer();
  await page.click('[data-speed="0"]');
  await page.waitForTimeout(150);
  check('paused', (await page.evaluate(() => window.__empires.game.clock.speed)) === 0);
  const a = await page.evaluate(() => window.__empires.scene.worldSnapshot());
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => window.__empires.scene.worldSnapshot());
  check('pause freezes breaks, walks and reactions', a === b, a === b ? '' : `${a}\n   vs ${b}`);

  // Reactions: a flop saddens the team (render reacts to the real score).
  const flash = await page.evaluate(() => {
    const { game, scene } = window.__empires;
    const p = game.state.projects[0];
    const fake = { ...p, result: { ...(p.result ?? {}), averageScore: 3.9 } };
    const prev = game.state.projects;
    game.state.projects = [fake];
    scene.handleEvents([{ type: 'project_released', projectId: p.id, severity: 'decisive' }], window.__empires.world.time);
    game.state.projects = prev;
    return [...scene.actors.values()].map((x) => x.view.flashExpr?.expr);
  });
  check('a flop makes the whole team look disappointed', flash.every((x) => x === 'frustrated'), flash.join(','));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
