/**
 * Pause e2e (ML.1): pausing freezes every world animation in its exact pose
 * while the UI, camera and decoration keep working; resuming continues without
 * jumps; a game loaded paused stays frozen; switching tab pauses.
 * Usage: node tools/e2e/pause.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-pause';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const snap = () => page.evaluate(() => window.__empires.scene.worldSnapshot());
  const tick = () => page.evaluate(() => window.__empires.game.state.tick);
  const answerAll = async () => { for (let i = 0; i < 10 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(250); } };
  // Decisions (moments, ideas) may pop up at any time and pause the game: answer before clicking a speed.
  // A decision can pop up (and pause the game) between answering and clicking, above all at 8x:
  // answer and retry, as a player would.
  const speed = async (v) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      await answerAll();
      try { await page.click(`[data-speed="${v}"]`, { timeout: 3000 }); return; } catch { /* a decision is asking: answer it first */ }
    }
    throw new Error(`could not set speed ${v}`);
  };
  await page.goto(`${base}/?fresh&debug&seed=21`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => window.__empires.unlockAll()); // tests the pause, not progression (D-062)
  await page.keyboard.press('p');
  await page.click('#start-project');
  await answerAll();

  // Optional diagnostics (EMPIRES_DIAG=1): log every change to an actor while world time is stopped.
  if (process.env.EMPIRES_DIAG) await page.evaluate(() => {
    const { game, scene } = window.__empires;
    window.__log = [];
    game.onUpdate((evs) => window.__log.push({ speed: game.clock.speed, tick: game.state.tick, types: evs.map((e) => e.type + (e.kind ? ':' + e.kind : '')), act: game.state.empirians[0].activity, pend: game.state.pendingDecision?.kind }));
    const orig = scene.update.bind(scene);
    window.__frames = [];
    scene.update = (dt, t, sf, r) => {
      const a = [...scene.actors.values()][0];
      const before = { tn: a.targetName, h: a.view.heading, rot: a.view.root.rotation.y, pose: a.view.pose, path: a.path.length };
      orig(dt, t, sf, r);
      if (dt === 0 && (before.tn !== a.targetName || before.h !== a.view.heading || before.rot !== a.view.root.rotation.y))
        window.__frames.push({ act: scene.lastState.empirians[0].activity, speed: game.clock.speed, from: before, to: { tn: a.targetName, h: a.view.heading, rot: a.view.root.rotation.y, pose: a.view.pose, path: a.path.length }, log: window.__log.slice(-3) });
    };
  });
  for (const sp of ['1', '2', '4', '8']) {
    await speed(sp);
    await page.waitForTimeout(1500);
    await answerAll();
    await speed(sp);
    await page.waitForTimeout(300);
    const wt = () => page.evaluate(() => ({ t: window.__empires.world.time, tick: window.__empires.game.state.tick, frames: window.__empires.scene.frames ?? null }));
    // Compare once world time has really advanced: the headless software renderer
    // sometimes draws no frame at all for a few hundred ms (sim and world both stop),
    // and a decision can pop up and pause the game meanwhile (then answer and measure again).
    let w1, w2, moving1, moving2;
    for (let attempt = 0; attempt < 4; attempt++) {
      w1 = await wt();
      moving1 = await snap();
      w2 = w1;
      for (let i = 0; i < 30 && w2.t < w1.t + 0.3 && !(await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.waitForTimeout(100); w2 = await wt(); }
      moving2 = await snap();
      if (w2.t >= w1.t + 0.3) break;
      await speed(sp);
      await page.waitForTimeout(300);
    }
    if (process.env.EMPIRES_DIAG) console.log('WT', sp, JSON.stringify(w1), JSON.stringify(w2), moving1 === moving2 ? 'SAME' : 'diff');
    check(`world animates at ${sp}x`, moving2 !== moving1, moving2 !== moving1 ? '' : moving1 + ' ' + await page.evaluate(() => JSON.stringify({ wt: window.__empires.world.time, act: window.__empires.game.state.empirians[0].activity, tick: window.__empires.game.state.tick, speed: window.__empires.game.clock.speed, pend: window.__empires.game.state.pendingDecision?.kind, modal: document.querySelector('.backdrop')?.className, tut: document.getElementById('tutorial-coach')?.dataset.step })));
    await speed('0');
    await page.waitForTimeout(100);
    const a = await snap(); const ta = await tick();
    await page.waitForTimeout(1500);
    const b = await snap(); const tb = await tick();
    check(`pause at ${sp}x freezes poses, bubbles and screen`, a === b, a === b ? '' : `${a.slice(0, 120)} vs ${b.slice(0, 120)}`);
    if (process.env.EMPIRES_DIAG && a !== b) console.log('DIAG', JSON.stringify(await page.evaluate(() => window.__frames.slice(-6))));
    check(`pause at ${sp}x stops simulation time`, ta === tb, `${ta} → ${tb}`);
  }
  await page.screenshot({ path: path.join(out, 'paused.png') });

  // UI keeps working while paused: menu, newspaper, camera zoom, decoration.
  await answerAll();
  await speed('0');
  await page.waitForTimeout(200);
  const frozen = await snap();
  await page.keyboard.press('n'); await page.waitForTimeout(300);
  const dailyOk = await page.isVisible('.daily');
  await page.keyboard.press('Escape');
  await page.mouse.move(640, 360); await page.mouse.wheel(0, -300); await page.waitForTimeout(300);
  await page.keyboard.press('d'); await page.waitForTimeout(300);
  const decorOk = await page.isVisible('.decor-sheet');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check('menus, newspaper, zoom and decoration work while paused', dailyOk && decorOk);
  check('…and the world stays frozen meanwhile', (await snap()) === frozen);

  // Resume: continues from the same pose (first frame barely changes it).
  await speed('1');
  await page.waitForTimeout(50);
  const r1 = JSON.parse(await snap()).actors[0];
  const f = JSON.parse(frozen).actors[0];
  const jump = Math.hypot(r1[1] - f[1], r1[2] - f[2]);
  check('resume continues without jumps', jump < 6, `moved ${jump.toFixed(2)} voxels in the first frames`);

  // Switching tab pauses (and freezes).
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  const h1 = await snap();
  await page.waitForTimeout(800);
  check('hiding the tab pauses and freezes the world', (await page.evaluate(() => window.__empires.game.clock.speed)) === 0 && (await snap()) === h1);

  // Loading a paused game: everyone in place, frozen.
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  const l1 = await snap();
  await page.waitForTimeout(1200);
  const l2 = await snap();
  const founder = JSON.parse(l2).actors[0];
  check('a game loaded paused stays frozen', l1 === l2 && (await page.evaluate(() => window.__empires.game.clock.speed)) === 0);
  check('…with the founder already at a place (not mid-walk at the spawn point)', !!founder);
  await page.screenshot({ path: path.join(out, 'loaded-paused.png') });

  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
