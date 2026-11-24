/**
 * Tutorial e2e (AW.A): a first session guided step by step with real actions
 * (desktop), save/load in the middle, skip from the start, phone layout.
 * Usage: node tools/e2e/tutorial.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-tutorial';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const step = async () => (await page.isVisible('#tutorial-coach')) ? page.getAttribute('#tutorial-coach', 'data-step') : null;
  const glow = (sel) => page.evaluate((s) => !!document.querySelector(s)?.classList.contains('tut-target'), sel);
  const shot = (n) => page.screenshot({ path: path.join(out, `${n}.png`) });
  // Diagnostics for intermittent failures (0.17.0): what the screen and the game look like right now.
  const diag = () => page.evaluate(async () => ({ raf: await new Promise((r) => { const t0 = performance.now(); requestAnimationFrame(() => r(Math.round(performance.now() - t0))); setTimeout(() => r('none in 2s'), 2000); }), fps: window.__empires.ui.fpsNow ?? null, coach: document.getElementById('tutorial-coach')?.dataset.step ?? null, modal: document.querySelector('.backdrop')?.className ?? null, pend: window.__empires.game.state.pendingDecision?.kind ?? null, speed: window.__empires.game.clock.speed, decor: !!document.querySelector('.decor-sheet'), notes: [...document.querySelectorAll('.toast')].map((t) => t.textContent.slice(0, 40)), tut: window.__empires.game.state.tutorial.marks.join(','), active: window.__empires.game.state.tutorial.active, log: window.__empires.ui.modalLog.slice(-12), hudDecor: !!document.getElementById('hud-decor'), decorCls: document.getElementById('hud-decor')?.className ?? null, nDecor: document.querySelectorAll('#hud-decor').length, view: window.__empires.ui.tutorial.view?.target ?? null, glow: window.__empires.ui.tutorial.glowing?.id ?? null, glowConn: window.__empires.ui.tutorial.glowing?.isConnected ?? null, glowSame: window.__empires.ui.tutorial.glowing === document.getElementById('hud-decor'), tgt: [...document.querySelectorAll('.tut-target')].map((e) => e.id || e.className) })).then((d) => JSON.stringify(d) + ' errors=' + JSON.stringify(errors));
  const waitStep = async (id, ms = 2500) => { for (let i = 0; i < ms / 100; i++) { if ((await step()) === id) return true; await page.waitForTimeout(100); } return false; };
  const closeCards = async () => { for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(200); } };

  await page.goto(`${base}/?fresh&debug&seed=40`);
  await page.waitForTimeout(1500);
  check('1 founder: the creator shows a welcome and highlights Start', (await step()) === 'founder' && (await glow('#start-game')));
  await shot('t1-founder');
  await page.click('#start-game');
  await page.waitForTimeout(600);
  const meetDiag = () => page.evaluate(() => { const a = document.querySelector('.tut-arrow'); const r = a?.getBoundingClientRect(); return JSON.stringify({ coach: document.getElementById('tutorial-coach')?.dataset.step ?? null, arrow: a ? { display: a.style.display, x: Math.round(r.x), y: Math.round(r.y), w: r.width, h: r.height } : null, pos: window.__empires.scene.empirianScreenPos(window.__empires.game.state.founderId), modal: window.__empires.ui.modalKind, log: window.__empires.ui.modalLog.slice(-4) }); });
  { const ok = (await step()) === 'meet' && (await page.isVisible('.tut-arrow')); check('2 meet: points at the founder in the office', ok, ok ? '' : await meetDiag()); }
  await shot('t2-meet');
  // Click the founder in the scene.
  const pos = await page.evaluate(() => window.__empires.scene.empirianScreenPos(window.__empires.game.state.founderId));
  await page.mouse.click(pos.x, pos.y + 40);
  await page.waitForTimeout(400);
  const viaClick = await page.evaluate(() => window.__empires.game.state.tutorial.marks.includes('meet'));
  await closeCards();
  if (!viaClick) { await page.keyboard.press('f'); await page.waitForTimeout(300); await closeCards(); }
  check('3 speed: highlights the speed controls', (await waitStep('speed')) && (await glow('.speeds')), viaClick ? 'founder clicked in the office' : 'opened with F');
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);

  // Save & reload in the middle of the tutorial.
  await page.click('#hud-menu');
  await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  check('reload mid-tutorial resumes at the same step', (await step()) === 'first_game' && (await glow('#hud-new-project')));
  await page.click('#hud-new-project');
  await page.waitForTimeout(400);
  check('4 first game: explains budget, deadline and estimate inside the dialog', (await step()) === 'first_game' && (await glow('#start-project')));
  await shot('t4-plan');
  await page.click('#start-project');
  await page.waitForTimeout(500);
  check('5 progress: highlights the project', (await step()) === 'progress' && (await glow('.project-pill')));
  await page.click('.project-pill');
  await page.waitForTimeout(300);
  await page.click('.card .close');
  await page.waitForTimeout(200);
  check('6 decision: announced before it happens (or the decision is already asking)', (await waitStep('decision', 1500)) || (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)));
  for (let i = 0; i < 300 && !(await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) await page.evaluate(() => window.__empires.advance(10));
  await page.waitForTimeout(600);
  check('…and the coach hides while deciding (never interrupts a decision)', !(await page.isVisible('#tutorial-coach')));
  for (let i = 0; i < 5 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(400); }
  check('7 release: explained after the first decision', await waitStep('release'), await page.evaluate(() => JSON.stringify({ step: document.getElementById('tutorial-coach')?.dataset.step, tut: window.__empires.game.state.tutorial, pend: window.__empires.game.state.pendingDecision?.kind, kinds: window.__empires.game.state.ledger.slice(-6).map((l) => l.text.key) })));
  for (let i = 0; i < 400 && (await page.evaluate(() => !!window.__empires.game.state.activeProjectId)); i++) {
    await page.evaluate(() => window.__empires.advance(40));
    for (let j = 0; j < 5 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); j++) {
      if (await page.isVisible('[data-option="release"]')) await page.click('[data-option="release"]'); else await page.keyboard.press('1');
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(2600); // results open by themselves after the launch
  { const ok = (await waitStep('reviews', 4000)) && (await page.isVisible('.score-big')); check('8 reviews: explained next to the results', ok, ok ? '' : await diag() + ' modalKind=' + (await page.evaluate(() => window.__empires.ui.modalKind))); }
  await shot('t8-reviews');
  await closeCards();
  // Closing the results resumes the game: weekly sales and studio events (decisions) would keep
  // happening while we check the next steps. Pause, as a player reading the guide would (0.17.0).
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  { const ok = (await waitStep('decorate')) && (await glow('#hud-decor')); check('9 decorate: highlights Decorate', ok, ok ? '' : await diag()); }
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  check('…and keeps guiding inside decoration mode', (await step()) === 'decorate');
  await page.click('[data-cat="plant"]');
  await page.click('[data-buy="plant_small"]');
  for (const [cx, cz] of [[1, 7], [5, 7], [6, 6], [1, 6], [5, 1]]) {
    const c = await page.evaluate(([x, z]) => window.__empires.scene.cellScreenPos(x, z), [cx, cz]);
    await page.mouse.move(c.x, c.y); await page.waitForTimeout(200);
    if (await page.isEnabled('#decor-confirm')) { await page.mouse.click(c.x, c.y); break; }
  }
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  { const ok = (await step()) === 'story' && (await page.isVisible('.tut-arrow')); check('10 story: points at the shelf', ok, ok ? '' : await diag()); }
  await shot('t10-story');
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  await page.click('.card .close');
  await page.waitForTimeout(300);
  const dbg11 = await page.evaluate(() => ({ step: document.getElementById('tutorial-coach')?.dataset.step, ok: !!document.getElementById('tutorial-ok'), modal: document.querySelector('.backdrop')?.className, pend: window.__empires.game.state.pendingDecision?.kind, speed: window.__empires.game.clock.speed }));
  if (!(await page.isVisible('#tutorial-ok'))) { await page.waitForTimeout(1200); dbg11.after = await page.evaluate(() => ({ modal: document.querySelector('.backdrop')?.className, pend: window.__empires.game.state.pendingDecision?.kind })); }
  check('11 hiring: explained without forcing a hire', (await step()) === 'hiring' && (await page.isVisible('#tutorial-ok')), JSON.stringify(dbg11));
  await page.click('#tutorial-ok');
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => window.__empires.game.state.tutorial);
  check('tutorial completed and saved as finished', !t.active && t.finishedDay > 0 && !(await page.isVisible('#tutorial-coach')));
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  check('not shown again in the next session', !(await page.isVisible('#tutorial-coach')));
  // Help can restart it without touching the game.
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  const before = await page.evaluate(() => JSON.stringify(window.__empires.game.state.projects));
  await page.keyboard.press('?');
  await page.waitForTimeout(300);
  await shot('t-help');
  await page.click('#help-restart-tutorial');
  await page.waitForTimeout(400);
  { const same = (await page.evaluate(() => JSON.stringify(window.__empires.game.state.projects))) === before; const ok = (await step()) === 'meet' && same; check('Help restarts the tutorial; the game is untouched', ok, ok ? '' : `same=${same} ` + await meetDiag() + ' ' + await diag()); }

  // Skip from the very first screen.
  await page.goto(`${base}/?fresh&debug&seed=41`);
  await page.waitForTimeout(1500);
  await page.click('#tutorial-skip');
  await page.waitForTimeout(300);
  await page.click('#start-game');
  await page.waitForTimeout(500);
  check('skip from the start: no coach afterwards', !(await page.isVisible('#tutorial-coach')) && !(await page.evaluate(() => window.__empires.game.state.tutorial.active)));

  // Phone landscape: visible, small, not covering the speed controls.
  const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await phone.goto(`${base}/?fresh&debug&seed=42`);
  await phone.waitForTimeout(1500);
  await phone.tap('#start-game');
  // Wait for the guide (a fixed 600 ms was shorter than two frames under software GL).
  await phone.waitForSelector('#tutorial-coach', { timeout: 5000 }).catch(() => {});
  await phone.waitForTimeout(300);
  const coach = await phone.evaluate(() => { const r = document.getElementById('tutorial-coach')?.getBoundingClientRect(); const sp = document.querySelector('.speeds')?.getBoundingClientRect(); return r && sp ? { coach: [r.left, r.top, r.right, r.bottom], speeds: [sp.left, sp.top, sp.right, sp.bottom] } : null; });
  const overlap = coach && !(coach.coach[2] < coach.speeds[0] || coach.coach[0] > coach.speeds[2] || coach.coach[3] < coach.speeds[1] || coach.coach[1] > coach.speeds[3]);
  const text = await phone.textContent('#tutorial-coach');
  check('phone: coach visible, touch wording, not over the speed controls', !!coach && !overlap && /Toca|Tap/.test(text), text.slice(0, 60));
  await phone.screenshot({ path: path.join(out, 't-phone.png') });

  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
