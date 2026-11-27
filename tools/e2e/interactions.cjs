/**
 * Object interactions e2e (0.22.0, D-072): in their free time Empirians really
 * use things — play the arcade, read at the shelf, watch the TV — in the pose
 * of that use; one person per interaction point (reservations); with a meeting
 * table, chats happen around it; new finishes (brick, parquet) apply.
 * Usage: node tools/e2e/interactions.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-interactions';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?fresh&debug&seed=41`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(500);
  const setup = await page.evaluate(() => {
    const E = window.__empires, g = E.game, s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' }); E.unlockAll(); s.company.money = 199000; s.eventLog.lastDay = 1e9;
    const res = { expand: g.dispatch({ type: 'expand_office' }).ok, style: g.dispatch({ type: 'set_office_style', wall: 'brick', floor: 'parquet' }).ok };
    const place = (id, x, z, rot = 0) => { res[id] = g.dispatch({ type: 'buy_item', defId: id, x, z, rot }).ok; };
    place('meeting_table', 4, 7); place('tv_corner', 10, 0); place('lamp_arc', 13, 0); place('tall_cabinet', 0, 6, 1); place('arcade', 11, 3);
    let desks = 0;
    for (let z = 0; z < s.office.d && desks < 2; z++) for (let x = 0; x < s.office.w && desks < 2; x++) for (const rot of [0, 1, 2, 3]) if (desks < 2 && g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok) desks++;
    res.desks = desks;
    const traits = ['curious', 'sociable'];
    traits.forEach((trait, i) => {
      s.hiring.candidates.push({ id: `H-i${i}`, name: ['Lia', 'Teo', 'Mar'][i], appearance: { skin: i, hairStyle: i + 2, hairColor: i, top: i, topColor: i + 1, pantsColor: 2, accessory: 0 }, baseSkills: { tech: 3, design: 4, creativity: 5, management: 3 }, trait, salary: 400, expiresDay: 99 });
      g.dispatch({ type: 'hire', candidateId: `H-i${i}` });
    });
    res.team = s.empirians.length;
    return res;
  });
  check('setup: bigger office, brick and parquet, new furniture, a team of three', setup.expand && setup.style && setup.meeting_table && setup.tv_corner && setup.lamp_arc && setup.tall_cabinet && setup.arcade && setup.desks === 2 && setup.team === 3, JSON.stringify(setup));
  await page.waitForTimeout(800);
  const pois = await page.evaluate(() => Object.keys(window.__empires.scene.pois));
  check('the new furniture creates interaction points (play, read, watch, meeting table)', ['arcade', 'shelf', 'tv', 'meet:a', 'meet:b'].every((k) => pois.includes(k)), pois.join(','));
  // Free time for a while (no project): who goes where, in which pose.
  await page.evaluate(() => window.__empires.ui.setSpeed(4));
  const seen = new Set();
  let shared = 0, wrongPose = 0;
  const USED = ['arcade', 'shelf', 'tv', 'cabinet', 'whiteboard', 'beanbag', 'drink'];
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    if (await page.isVisible('.backdrop')) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); }
    const st = await page.evaluate(() => [...window.__empires.scene.actors.values()].map((a) => ({ t: a.targetName, arrived: a.path.length === 0 && Math.hypot(a.target.x - a.pos[0], a.target.z - a.pos[1]) < 1, want: a.target.pose, pose: a.view.pose })));
    const targets = st.map((a) => a.t).filter((t) => USED.includes(t));
    if (new Set(targets).size !== targets.length) shared++;
    for (const a of st) if (a.arrived && ['play', 'read', 'watch'].includes(a.want)) { seen.add(a.want); if (a.pose !== a.want) wrongPose++; }
  }
  check('in free time they really use things: at least two of play / read / watch seen', seen.size >= 2, [...seen].join(','));
  check('…in the pose of that use once there', wrongPose === 0, `${wrongPose} samples off`);
  check('one person per interaction point (never two at the arcade, the TV…)', shared === 0, `${shared} samples shared`);
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.screenshot({ path: path.join(out, 'interactions.png') });
  // A chat with a meeting table happens around it.
  const chat = await page.evaluate(() => {
    const E = window.__empires, s = E.game.state, sc = E.scene;
    const [a, b] = s.empirians.slice(1).map((e) => e.id).sort();
    sc.handleEvents([{ type: 'routine', kind: 'chat', empirianId: a, partnerId: b, severity: 'info' }], E.world?.now?.() ?? performance.now() / 1000);
    const pa = sc.pois[`chat:${a}`], pb = sc.pois[`chat:${b}`], ma = sc.pois['meet:a'], mb = sc.pois['meet:b'];
    return { ok: !!pa && !!pb && pa.x === ma.x && pa.z === ma.z && pb.x === mb.x && pb.z === mb.z, facing: pa && pb ? Math.cos(pa.heading - pb.heading) : null };
  });
  check('with a meeting table, a chat happens at both ends of it, face to face', chat.ok && chat.facing !== null && chat.facing < -0.5, JSON.stringify(chat));
  // Zones and style, described in decoration mode (and the labels never block the panel).
  await page.keyboard.press('d');
  await page.waitForTimeout(500);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.zone-label')].map((e) => e.dataset.zone));
  check('decoration mode names the zones the furniture makes (games corner here)', labels.includes('games'), labels.join(','));
  await page.click('[data-cat="style"]', { timeout: 3000 }).catch(() => {});
  const ident = await page.evaluate(() => document.querySelector('#office-identity')?.dataset ?? null);
  check('…the panel stays usable over the labels, and describes the office style', !!ident && ident.vibes.length > 0 && (await page.isVisible('[data-cat="style"].on')), JSON.stringify(ident));
  await page.screenshot({ path: path.join(out, 'zones.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('…and the labels go away with it', (await page.locator('.zone-label').count()) === 0);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
