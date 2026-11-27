/**
 * Visual review gallery (F1.12). Plays a scripted game with a fixed seed and
 * captures the shots listed in docs/screenshots/README.md.
 * Usage (with `npm run build` + `npx vite preview --port 4173` running):
 *   node tools/e2e/gallery.cjs http://localhost:4173 docs/screenshots
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || 'docs/screenshots';
fs.mkdirSync(out, { recursive: true });

const VARIANTS = [
  { skin: 0, hairStyle: 3, hairColor: 4, top: 1, topColor: 4, pantsColor: 0, accessory: 1 },
  { skin: 6, hairStyle: 5, hairColor: 0, top: 2, topColor: 7, pantsColor: 3, accessory: 0 },
  { skin: 3, hairStyle: 4, hairColor: 8, top: 3, topColor: 2, pantsColor: 4, accessory: 0 },
  { skin: 4, hairStyle: 2, hairColor: 9, top: 0, topColor: 5, pantsColor: 1, accessory: 2 },
  { skin: 1, hairStyle: 6, hairColor: 7, top: 4, topColor: 6, pantsColor: 2, accessory: 4 },
  { skin: 7, hairStyle: 7, hairColor: 5, top: 1, topColor: 0, pantsColor: 5, accessory: 3 },
  { skin: 2, hairStyle: 1, hairColor: 11, top: 0, topColor: 8, pantsColor: 0, accessory: 5 },
  { skin: 5, hairStyle: 0, hairColor: 2, top: 2, topColor: 1, pantsColor: 3, accessory: 0 },
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const shot = async (name, wait = 0) => {
    if (wait) await page.waitForTimeout(wait);
    await page.addStyleTag({ content: '.diag{display:none!important}' + (name.includes('lineup') ? '.speech{display:none!important}' : '') });
    await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88 });
    console.log('saved', name);
  };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const frame = (s) => ev((s) => window.__empires.scene.frameShot(s), s);

  // 01 founder creation + variations
  await page.goto(`${base}/?fresh&debug&seed=42`);
  await page.waitForTimeout(2500);
  await shot('g01-founder-creation');
  await page.fill('#founder-name', 'Nora');
  await page.fill('#company-name', 'Nube Games');
  for (const [k, n] of [['hairStyle', 1], ['top', 1]]) for (let i = 0; i < n; i++) await page.click(`[data-step="${k}"]`);
  await page.click('button[aria-label="skin 4"]');
  await page.click('button[aria-label="hairColor 9"]');
  await page.click('button[aria-label="topColor 3"]');
  await shot('g02-founder-customized', 800);
  await page.click('#start-game');
  await page.evaluate(() => window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' })); // general shots without the guide
  await page.waitForTimeout(2000);

  // 03 initial room (empty)
  await ev(() => window.__empires.scene.pinEmpirian(window.__empires.game.state.founderId, 30, 31, Math.PI / 4));
  await shot('g03-room-initial', 2500);

  // 04 customization lineup (render-only Empirians, same models as the game)
  await ev((variants) => {
    const sc = window.__empires.scene;
    variants.forEach((a, i) => {
      const id = `lineup-${i}`;
      sc.ensureEmpirian(id, a);
      sc.pinEmpirian(id, 8 + (i % 4) * 13, 23 + Math.floor(i / 4) * 15, Math.PI / 4);
    });
    sc.pinEmpirian(window.__empires.game.state.founderId, 54, 14, Math.PI / 4);
    sc.frameShot({ x: 29, y: 10, z: 31, viewH: 4.6 });
  }, VARIANTS);
  await shot('g04-customization-lineup', 3000);
  await page.goto(`${base}/?debug`); // drop render-only Empirians
  await page.waitForTimeout(2000);

  // 05/06 cameras
  await ev(() => window.__empires.scene.pinEmpirian(window.__empires.game.state.founderId, 30, 31, Math.PI / 4));
  await shot('g05-camera-dimetric', 2000);
  await ev(() => window.__empires.scene.setCameraMode('iso'));
  await shot('g06-camera-isometric', 1500);
  await ev(() => window.__empires.scene.setCameraMode('dim'));

  // 07 new project card
  await page.click('#hud-new-project');
  await page.click('[data-topic="kart"]');
  await shot('g07-new-project', 600);
  await page.click('#start-project');

  // 08/09 active development + bubbles close-up
  await ev(() => window.__empires.ui.setSpeed(1));
  await ev(() => window.__empires.advance(30));
  await shot('g08-development', 6000);
  await frame({ x: 26, y: 16, z: 18, viewH: 2.6 });
  await ev(() => window.__empires.advance(6));
  await shot('g09-bubbles-closeup', 1200);
  await frame(null);

  // 10/11 decisive moment (answer any earlier dynamic event first)
  for (let i = 0; i < 300; i++) {
    const kind = await ev(() => window.__empires.game.state.pendingDecision?.kind ?? null);
    if (kind === 'big_idea') break;
    if (kind) { await page.waitForTimeout(600); await page.click('.option >> nth=-1'); await page.waitForTimeout(400); }
    else await ev(() => window.__empires.advance(20));
  }
  await page.waitForTimeout(1500);
  await shot('g10-decision');
  await page.addStyleTag({ content: '.backdrop{display:none!important}' });
  await frame({ x: 36, y: 22, z: 22, viewH: 2.2 });
  await shot('g11-raising-hand', 2500);
  await page.addStyleTag({ content: '.backdrop{display:flex!important}' });
  await frame(null);
  await page.click('[data-option="approve"]');

  // finish production, polish a bit, release
  let polishShot = false;
  for (let i = 0; i < 400; i++) {
    const s = await ev(() => { const st = window.__empires.game.state; const p = st.projects[0]; return { phase: p.phase, polish: p.polishDone, pend: !!st.pendingDecision }; });
    if (s.pend) {
      await page.waitForTimeout(900);
      if (await page.isVisible('[data-option="release"]')) await page.click('[data-option="release"]');
      else if (await page.isVisible('.option')) { if (!polishShot && await page.isVisible('[data-option="balanced"]')) { await shot('g21-moment-polish-plan'); polishShot = true; } await page.click('.option >> nth=1'); }
      continue;
    }
    if (s.phase === 'released' || (s.phase === 'polish' && s.polish > 40)) break;
    await ev(() => window.__empires.advance(30));
  }
  if (await ev(() => window.__empires.game.state.projects[0].phase !== 'released')) {
    await page.click('#hud-release', { force: true });
    await page.click('#confirm-release');
  }
  // 12 celebration
  await frame({ x: 30, y: 16, z: 26, viewH: 3.4 });
  await shot('g12-launch-celebration', 900);
  await frame(null);
  // 13 reviews
  await page.waitForTimeout(2600);
  // (story events such as a critic may ask meanwhile: answer with the neutral last option)
  await ev(() => { const g = window.__empires.game; for (let i = 0; i < 8 * 7 * 4; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1].id }); else g.tick(); } });
  if (!(await page.isVisible('.card .close'))) await ev(() => window.__empires.ui.showResults?.(window.__empires.game.state.projects[0].id));
  await shot('g13-reviews', 3200);
  await page.click('.card .close');
  // 14/15 collectible box
  await shot('g14-room-after-launch', 2000);
  await frame({ x: 4, y: 26, z: 26, viewH: 1.6 });
  await shot('g15-collectible-box', 1500);
  await frame(null);

  // 16-19 phone landscape (layout review)
  for (const [w, hgt, tag] of [[844, 390, 'phone'], [667, 375, 'small-phone']]) {
    await page.setViewportSize({ width: w, height: hgt });
    await page.waitForTimeout(800);
    await page.click('#hud-new-project');
    await shot(`g16-${tag}-new-project`, 700);
    await page.click('.card .close');
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.click('#hud-menu');
  await shot('g17-phone-menu', 500);
  await page.click('.card .close');
  await page.evaluate(() => window.__empires.ui.showResults(window.__empires.game.state.projects[0].id));
  await shot('g18-phone-results', 1500);
  await page.click('.card .close');
  // phone decision: start a second project and wait for the big idea
  await page.click('#hud-new-project');
  await page.click('#start-project');
  for (let i = 0; i < 300 && !(await ev(() => !!window.__empires.game.state.pendingDecision)); i++) await ev(() => window.__empires.advance(20));
  await shot('g19-phone-decision', 1500);

  // 20 English draft
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/?debug&lang=en`);
  await shot('g20-english-decision', 2500);

  // 22-28 "A Living Studio" (LS.1–LS.8)
  await page.goto(`${base}/?fresh&debug&seed=42`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' })); // general shots without the guide
  // From here on the gallery shows later systems: open them as an experienced studio would have (D-062).
  await ev(() => { window.__empires.game.state.company.money = 30000; window.__empires.unlockAll(); });
  await ev(() => window.__empires.advance(8 * 40));
  await page.waitForTimeout(500);
  await page.click('#hud-decor');
  await shot('g22-decor-catalog', 800);
  await ev(() => {
    const g = window.__empires.game;
    const desk = g.state.office.items.find((i) => i.defId === 'desk_basic');
    for (const c of [
      { type: 'mount_item', defId: 'pc_dev', deskUid: desk.uid },
      { type: 'mount_item', defId: 'chair_ergo', deskUid: desk.uid },
      { type: 'buy_item', defId: 'coffee_machine', x: 6, z: 0, rot: 0 },
      { type: 'buy_item', defId: 'whiteboard', x: 0, z: 0, rot: 1 },
      { type: 'buy_item', defId: 'lamp_floor', x: 9, z: 3, rot: 0 },
    ]) { const r = g.dispatch(c); if (!r.ok) console.log('gallery buy failed', c.defId, r.error); }
    for (const [x, z] of [[0, 6], [1, 7], [9, 7], [5, 7]]) if (g.dispatch({ type: 'buy_item', defId: 'plant_tall', x, z, rot: 0 }).ok) break;
  });
  await page.click('[data-cat="comfort"]');
  await page.click('[data-buy="sofa"]');
  // Desktop: the ghost follows the mouse; a click places it.
  for (const [cx, cz] of [[4, 4], [3, 4], [2, 4], [4, 5], [3, 5]]) {
    const cell = await ev(([x, z]) => window.__empires.scene.cellScreenPos(x, z), [cx, cz]);
    await page.mouse.move(cell.x, cell.y);
    await page.waitForTimeout(300);
    if (await page.isEnabled('#decor-confirm')) {
      await shot('g23-decor-placing', 500);
      await page.mouse.click(cell.x, cell.y);
      await page.waitForTimeout(400);
      break;
    }
  }
  await page.click('#decor-done');
  await shot('g24-office-furnished', 2000);
  await page.click('#hud-news');
  await shot('g25-empires-daily', 800);
  await page.click('.card .close');
  await ev(() => window.__empires.ui.showEmpirian(window.__empires.game.state.empirians[0].id));
  await shot('g26-skills-card', 800);
  await page.click('.card .close');
  await ev(() => window.__empires.advance(8 * 7));
  await page.click('#hud-contracts');
  await shot('g27-contract-offers', 800);
  await page.click('[data-accept]');
  await ev(() => window.__empires.advance(8 * 3));
  await shot('g28-contract-working', 2500);
  await page.setViewportSize({ width: 844, height: 390 });
  await ev(() => window.__empires.advance(8 * 60));
  await page.waitForTimeout(800);
  await page.click('#hud-decor');
  await shot('g29-phone-decor', 1000);

  // 31-32 Growing Together (GT.1): applicants and a second Empirian at work.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.click('#decor-done');
  await ev(() => { const s = window.__empires.game.state; s.contracts.completed = Math.max(1, s.contracts.completed); s.company.money = Math.max(30000, s.company.money); });
  await ev(() => window.__empires.advance(8 * 15));
  await page.waitForTimeout(500);
  await page.keyboard.press('t');
  await shot('g30-team-candidates', 900);
  await page.keyboard.press('Escape');
  await ev(() => {
    const g = window.__empires.game;
    const sofa = g.state.office.items.find((i) => i.defId === 'sofa');
    if (sofa) g.dispatch({ type: 'sell_item', uid: sofa.uid }); // make room for a second desk
    search: for (let z = 2; z < 8; z++) for (let x = 0; x < 10; x++) for (const rot of [0, 1, 2, 3]) if (g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok) break search;
    const c = g.state.hiring.candidates[0];
    if (c) g.dispatch({ type: 'hire', candidateId: c.id });
  });
  await page.keyboard.press('p');
  await page.click('#start-project');
  await ev(() => window.__empires.advance(8 * 4));
  for (let i = 0; i < 10 && (await ev(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(300); }
  await ev(() => window.__empires.ui.setSpeed(1));
  await shot('g31-team-working', 4000);

  // 33-34 More Life (ML.2/ML.3): the studio story and the trophies.
  await ev(() => window.__empires.ui.setSpeed(0));
  await ev(() => { window.__empires.game.state.company.money = 120000; window.__empires.advance(8); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 4 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(200); }
  await page.keyboard.press('h');
  await shot('g32-studio-story', 800);
  for (let i = 0; i < 4 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(250); }
  await page.evaluate(() => window.__empires.ui.decor.open());
  await page.waitForTimeout(300);
  await page.click('[data-cat="awards"]');
  await shot('g33-trophies', 600);
  await page.click('#decor-done');

  // 35-36 Tutorial (AW.A) and Help.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/?fresh&debug&seed=42`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await shot('g34-tutorial', 1200);
  await page.keyboard.press('?');
  await shot('g35-help', 600);
  await page.click('.card .close');
  // 42 Features & prototype (AW.D), in the new-project dialog (a studio that has unlocked them, D-062).
  await ev(() => window.__empires.unlockAll());
  await page.keyboard.press('p');
  await page.click('[data-topic="pirates"]');
  await page.click('[data-feature="story"]');
  await page.check('#np-prototype');
  await shot('g41-features', 600);
  await page.click('.card .close');

  // 37 Living office (AW.B): a chat break between two Empirians.
  await page.goto(`${base}/?fresh&debug&seed=50`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await ev(() => {
    const g = window.__empires.game;
    g.dispatch({ type: 'tutorial', action: 'skip' });
    const s = g.state;
    s.company.money = 60000;
    const place = (defId) => { for (let z = 0; z < 8; z++) for (let x = 0; x < 10; x++) for (const rot of [0, 1, 2, 3]) if (g.dispatch({ type: 'buy_item', defId, x, z, rot }).ok) return; };
    place('water_cooler'); place('desk_basic');
    s.contracts.completed = 1;
    s.hiring.candidates.push({ id: 'H-g', name: 'Iris', appearance: { skin: 3, hairStyle: 4, hairColor: 8, top: 3, topColor: 2, pantsColor: 4, accessory: 0 }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 5 }, trait: 'sociable', salary: 400, expiresDay: 99 });
    g.dispatch({ type: 'hire', candidateId: 'H-g' });
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'medium', focus: 0.7, budget: 3000, days: 98, price: 14.99 });
  });
  await ev(() => window.__empires.ui.setSpeed(1));
  for (let i = 0; i < 400 && !(await ev(() => window.__empires.game.state.empirians.some((e) => e.activity === 'chatting'))); i++) {
    for (let j = 0; j < 4 && (await ev(() => !!window.__empires.game.state.pendingDecision)); j++) { await page.keyboard.press('1'); await page.waitForTimeout(200); }
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(2600); // they walk to each other and talk for a few seconds
  await ev(() => window.__empires.ui.setSpeed(0));
  await shot('g36-living-office', 300);

  // 38-40 Identity (AW.C): character sheet, appearance editor, walls & floor.
  await page.keyboard.press('f');
  await shot('g37-character-sheet', 600);
  await page.click('#edit-empirian');
  await shot('g38-editor', 800);
  await page.click('#editor-cancel');
  await page.waitForTimeout(300);
  await ev(() => window.__empires.ui.decor.open());
  await page.click('[data-cat="style"]');
  await page.click('[data-wall="mint"]');
  await page.click('[data-floor="tiles"]');
  await shot('g39-walls-floor', 800);
  await page.click('#decor-done');

  // 41 Bigger studio (AW.E.1).
  await ev(() => { const g = window.__empires.game; g.state.company.money = Math.max(g.state.company.money, 40000); g.dispatch({ type: 'expand_office' }); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 4 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(200); }
  await shot('g40-bigger-studio', 2500);

  // 43 Who does what (AW.E.2).
  await ev(() => window.__empires.ui.showTeam());
  await page.waitForTimeout(300);
  const second = await ev(() => window.__empires.game.state.empirians[1]?.id);
  if (second) await page.click(`[data-role-of="${second}"] [data-role="test"]`);
  await shot('g42-roles', 500);
  await page.keyboard.press('Escape');

  // 44 A story event raised by an employee.
  await ev(() => {
    const g = window.__empires.game;
    if (!g.state.activeProjectId) g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
  });
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await ev(() => window.__empires.forceEvent('team_idea'));
  await shot('g43-team-idea', 1800);
  await page.keyboard.press('1');

  // 45-46 Relationships (E.3): a friendship forms (hearts over both), and the sheet tells it.
  const pair = await ev(() => {
    const g = window.__empires.game; const s = g.state;
    const [x, y] = [s.empirians[0].id, s.empirians[1].id].sort();
    s.relations = [{ a: x, b: y, bond: 42, days: 3, shared: 0, hits: 0, since: 0 }];
    s.empirians[1].trait = 'sociable';
    let ok = false;
    const off = g.onUpdate((evs) => { if (evs.some((e) => e.type === 'relation' && e.kind === 'friends')) ok = true; });
    for (let i = 0; i < 8 * 8 && !ok; i++) { const d = s.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1].id }); else g.tick(); }
    off();
    window.__empires.ui.setSpeed(0);
    return s.empirians[1].id;
  });
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await shot('g44-friends', 500);
  await ev((id) => window.__empires.ui.showEmpirian(id), pair);
  await shot('g45-relations-sheet', 600);

  // 47 A team proposal (one per project): a code shortcut (F3.4) or a scope idea (D-058).
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  const asked = await ev(() => {
    const g = window.__empires.game; const s = g.state;
    if (!s.activeProjectId) g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
    for (let i = 0; i < 20000 && s.activeProjectId; i++) {
      const d = s.pendingDecision;
      if (d && (d.kind === 'tech_shortcut' || d.kind === 'scope_idea')) return true;
      if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'polish_plan' ? 'balanced' : d.kind === 'deadline' ? 'release' : d.options[0].id });
      else g.tick();
    }
    return false;
  });
  if (asked) await shot('g46-team-proposal', 1800);

  // 48 Reputation with memory (F3.8): what people say about the studio, in words.
  if (asked) await page.keyboard.press('1');
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await ev(() => { window.__empires.ui.setSpeed(0); window.__empires.game.state.company.fame = { quality: 6, reliability: 2.5, innovation: -2 }; window.__empires.ui.showStory(); });
  await shot('g47-studio-fame', 600);

  // 49 Kinds of project (D.4): an ambitious plan (medium game, two features), told in the same dialog.
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await ev(() => { const g = window.__empires.game; g.dispatch({ type: 'release' }); window.__empires.ui.setSpeed(0); });
  await ev(() => { window.__empires.play(8 * 3); window.__empires.ui.setSpeed(0); });
  for (let i = 0; i < 6 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(200); }
  await ev(() => window.__empires.ui.showNewProject());
  await page.waitForTimeout(300);
  // Only when the new-game dialog is really open (with an active project the game offers other cards).
  if ((await page.isVisible('#start-project')) && (await page.locator('.seg button', { hasText: /^(Mediano|Medium)/ }).count())) {
    await page.locator('.seg button', { hasText: /^(Mediano|Medium)/ }).first().click();
    // Two features that are always unlocked (the grid redraws after each click, so pick them by id).
    for (const f of ['story', 'customization']) { await page.click(`[data-feature="${f}"]`); await page.waitForTimeout(150); }
    await shot('g48-ambitious-plan', 400);
  }

  // 50–52 (0.17.0): a launch ("Now on sale!" and its tier), your games (GT.6) and a patch at work.
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await ev(() => {
    const E = window.__empires, g = E.game;
    if (!g.state.activeProjectId) g.dispatch({ type: 'start_project', name: 'Faro', topicId: 'kart', size: 'small', focus: 0.6, budget: 500, days: 35, price: 9.99 });
    for (let i = 0; i < 20000 && g.state.activeProjectId; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[0].id }); else E.advance(1); }
  });
  await shot('g50-now-on-sale', 500);
  await page.waitForTimeout(2200);
  for (let i = 0; i < 4 && (await page.isVisible('.card.decision')); i++) { await page.keyboard.press('1'); await page.waitForTimeout(600); }
  if (await page.isVisible('.card.results')) await shot('g51-launch-tier', 1200);
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await ev(() => { const s = window.__empires.game.state; window.__empires.unlockAll(); window.__empires.ui.setSpeed(0); const p = s.projects.find((q) => q.result); p.bugs.hidden = Math.max(p.bugs.hidden, 14); window.__empires.ui.showProducts(); });
  await shot('g52-your-games', 600);
  const pid = await ev(() => window.__empires.game.state.projects.find((q) => q.result && q.bugs.hidden > 0)?.id);
  if (pid && (await page.isEnabled(`[data-support="patch"][data-project="${pid}"]`))) {
    await page.click(`[data-support="patch"][data-project="${pid}"]`);
    await page.waitForTimeout(600);
    for (let i = 0; i < 4 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(300); }
    await ev(() => window.__empires.ui.setSpeed(1));
    await shot('g53-patching', 1200);
  }

  // 54 (0.18.0): sound settings in the menu.
  for (let i = 0; i < 4 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(200); }
  await ev(() => { window.__empires.ui.setSpeed(0); window.__empires.ui.showMenu(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('menu-sound')?.scrollIntoView());
  await shot('g54-sound-menu', 300);

  // 55–56 (0.19.0): the game cabinet with the studio's games, and the team's ideas when planning.
  await ev(() => { const E = window.__empires, g = E.game, s = g.state; E.ui.closeModal(); s.company.money += 5000; for (let z = 0; z < s.office.d; z++) for (let x = 0; x < s.office.w; x++) if (g.dispatch({ type: 'buy_item', defId: 'game_cabinet', x, z, rot: 0 }).ok) return; });
  await page.waitForTimeout(800);
  for (let i = 0; i < 4 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(250); }
  await ev(() => window.__empires.ui.setSpeed(0));
  await shot('g55-game-cabinet', 600);
  await ev(() => { const E = window.__empires, s = E.game.state; if (s.activeProjectId) E.game.dispatch({ type: 'release' }); });
  await ev(() => window.__empires.play(8 * 3));
  for (let i = 0; i < 6 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(250); }
  await ev(() => { const s = window.__empires.game.state; s.company.inspirations = [{ id: 'I-g1', day: s.day, kind: 'combo', source: 'chat', topicId: 'cooking', featureId: 'customization', by: s.empirians[1]?.id ?? s.founderId }, { id: 'I-g2', day: s.day, kind: 'polish', source: 'lesson', by: s.founderId, project: s.projects[0]?.name }]; window.__empires.ui.setSpeed(0); window.__empires.ui.showNewProject(); });
  await page.waitForTimeout(400);
  if (await page.isVisible('#np-ideas')) { await page.evaluate(() => document.getElementById('np-ideas').scrollIntoView()); await shot('g56-team-ideas', 300); }

  // 57 (0.21.0): the camera closer, gently turned, on the team at work.
  for (let i = 0; i < 6 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(250); }
  await ev(() => { const E = window.__empires; E.ui.setSpeed(1); E.scene.lookAtEmpirian(E.game.state.founderId); E.scene.rig.rotateBy(0.25); });
  await page.waitForTimeout(2500);
  await ev(() => window.__empires.ui.setSpeed(0));
  await shot('g57-camera-closer', 400);


  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
