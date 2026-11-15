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
  await page.click('[data-speed="1"]');
  await ev(() => window.__empires.advance(30));
  await shot('g08-development', 6000);
  await frame({ x: 26, y: 16, z: 18, viewH: 2.6 });
  await ev(() => window.__empires.advance(6));
  await shot('g09-bubbles-closeup', 1200);
  await frame(null);

  // 10/11 decisive moment
  for (let i = 0; i < 300 && !(await ev(() => !!window.__empires.game.state.pendingDecision)); i++) await ev(() => window.__empires.advance(20));
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
  await ev(() => { for (let i = 0; i < 8 * 7 * 4; i++) window.__empires.game.tick(); });
  await shot('g13-reviews', 1500);
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

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
