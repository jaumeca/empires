/**
 * Relationships e2e (E.3 / D-056): a friendship forms from chats and is
 * celebrated in the office, the character sheet shows it in a few lines, a
 * mentor visibly sits with the learner, everything survives save/load.
 * Usage: node tools/e2e/relations.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-relations';
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
  await page.goto(`${base}/?fresh&debug&seed=93`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  const ids = await page.evaluate(() => {
    const g = window.__empires.game; const s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' });
    s.company.money = 60000; s.contracts.completed = 1; s.eventLog.lastDay = 1e9;
    let ok = false;
    for (let z = 0; z < s.office.d && !ok; z++) for (let x = 0; x < s.office.w && !ok; x++) for (const rot of [0, 1, 2, 3]) if (!ok) ok = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: 'H-rel', name: 'Lia', appearance: { skin: 4, hairStyle: 5, hairColor: 3, top: 3, topColor: 2, pantsColor: 4, accessory: 0 }, baseSkills: { tech: 3, design: 5, creativity: 5, management: 4 }, trait: 'sociable', salary: 450, expiresDay: 99 });
    g.dispatch({ type: 'hire', candidateId: 'H-rel' });
    g.dispatch({ type: 'start_project', name: 'Amigos', topicId: 'pirates', size: 'small', focus: 0.6, budget: 1500, days: 42, price: 9.99 });
    return s.empirians.map((e) => e.id);
  });
  await closeCards();
  // Sheet before: no special bonds yet.
  await page.evaluate((id) => window.__empires.ui.showEmpirian(id), ids[1]);
  await page.waitForTimeout(300);
  check('the sheet says bonds come from working together', /Todavía no ha forjado|No special bonds/.test(await page.textContent('.relations')));
  await closeCards();

  // Close to friends: the next chat makes them friends, and the office shows it.
  const found = await page.evaluate(([a, b]) => {
    const g = window.__empires.game; const s = g.state;
    const [x, y] = a < b ? [a, b] : [b, a];
    s.relations = [{ a: x, b: y, bond: 42, days: 3, shared: 0, hits: 0, since: 0 }];
    const seen = [];
    const off = g.onUpdate((evs) => { for (const e of evs) if (e.type === 'relation' || (e.type === 'routine' && e.kind === 'chat')) seen.push(e.type === 'relation' ? `relation:${e.kind}` : 'chat'); });
    for (let i = 0; i < 8 * 6 && !seen.some((k) => k === 'relation:friends'); i++) { const d = s.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[0].id }); else g.tick(); }
    off();
    return seen;
  }, ids);
  check('they chat and become friends', found.includes('chat') && found.includes('relation:friends'), found.join(','));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'friends.png') });
  let s = await st();
  const mem = s.story.memories.find((m) => m.text.key === 'memory.relation.friends');
  check('the friendship is in the studio Story with both', !!mem && mem.empirianIds.length === 2);
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.evaluate((id) => window.__empires.ui.showEmpirian(id), ids[1]);
  await page.waitForTimeout(500);
  const rel = await page.textContent('.relations');
  check('the sheet shows it in a line, with what it means', /Amistad con|Friends with/.test(rel) && (await page.locator('.relations li').count()) <= 3, rel.slice(0, 120));
  await page.screenshot({ path: path.join(out, 'sheet-relations.png') });
  await closeCards();

  // Mentoring: the founder is much better at code; every other day they sit together.
  const mentoring = await page.evaluate(([a, b]) => {
    const g = window.__empires.game; const s = g.state;
    const f = s.empirians.find((e) => e.id === a);
    f.skills.tech = 8.5; f.baseSkills.tech = 8.5;
    const r = s.relations[0]; r.mentor = a; r.mentorSkill = 'tech'; r.mentorDone = true;
    const seen = [];
    const off = g.onUpdate((evs) => { for (const e of evs) if (e.type === 'routine' && e.mentoring) seen.push(e.empirianId); });
    for (let i = 0; i < 8 * 4 && !seen.length; i++) { const d = s.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[0].id }); else g.tick(); }
    off();
    return { seen, chatWith: s.empirians.find((e) => e.id === b).chatWith };
  }, ids);
  check('a mentor sits with the learner (visible session)', mentoring.seen.includes(ids[0]) && mentoring.seen.includes(ids[1]), JSON.stringify(mentoring));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'mentoring.png') });

  // Save / load (paused, so nothing moves in between).
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  const before = (await st()).relations;
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  s = await st();
  check('relationships survive save/load', JSON.stringify(s.relations) === JSON.stringify(before), JSON.stringify(before) + ' vs ' + JSON.stringify(s.relations) + ' speed ' + s.tick);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
