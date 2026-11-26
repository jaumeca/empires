/**
 * Sound e2e (0.18.0): silent until the first gesture (autoplay rules), soft
 * interface sounds, keyboards only while the world runs (the pause silences
 * them, not the interface), volume/mute saved across reloads, and the game
 * works the same with ?mute (no audio at all).
 * Usage: node tools/e2e/sound.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-sound';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const log = () => page.evaluate(() => [...window.__empires.sound.log]);
  await page.goto(`${base}/?fresh&debug&seed=11`);
  await page.waitForTimeout(1500);
  check('silent before any gesture (no audio context yet)', !(await page.evaluate(() => window.__empires.sound.ready)) && (await log()).length === 0);
  await page.click('#start-game');
  await page.waitForTimeout(400);
  check('the first click starts the audio', await page.evaluate(() => window.__empires.sound.ready));
  check('…and buttons make a soft click', (await log()).includes('click'), (await log()).join(','));
  await page.evaluate(() => { window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.game.dispatch({ type: 'start_project', name: 'Eco', topicId: 'kart', size: 'small', focus: 0.7, budget: 500, days: 35, price: 9.99 }); });
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(200); }
  await page.click('[data-speed="1"]');
  await page.waitForFunction(() => window.__empires.game.state.empirians.some((e) => e.activity === 'coding' || e.activity === 'testing'), null, { timeout: 30000 }).catch(() => {});
  const t0 = await page.evaluate(() => window.__empires.world.time);
  await page.waitForFunction((t0) => window.__empires.world.time > t0 + 4 || !!window.__empires.game.state.pendingDecision, t0, { timeout: 60000 });
  const typed = (await log()).filter((s) => s === 'type').length;
  check('keyboards sound while someone types', typed > 0, `${typed} key presses`);
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.waitForTimeout(300);
  const before = (await log()).filter((s) => s === 'type').length;
  await page.waitForTimeout(2500);
  const after = (await log()).filter((s) => s === 'type').length;
  check('the pause silences the world (no keyboards)', after === before, `${before} → ${after}`);
  await page.click('#hud-menu');
  await page.waitForTimeout(300);
  check('…but the interface still sounds while paused', (await log()).slice(-3).includes('open'), (await log()).slice(-4).join(','));
  check('the menu has volume, effects, ambience and mute', await page.isVisible('#sound-master') && await page.isVisible('#sound-effects') && await page.isVisible('#sound-ambience') && await page.isVisible('#sound-mute'));
  await page.screenshot({ path: path.join(out, 'menu-sound.png') });
  await page.$eval('#sound-ambience', (el) => { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.click('#sound-mute');
  await page.waitForTimeout(200);
  const n = (await log()).length;
  await page.click('.card .close');
  await page.waitForTimeout(200);
  check('muted: nothing plays', (await log()).length === n);
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  const prefs = await page.evaluate(() => window.__empires.sound.prefs);
  check('volume and mute survive a reload', prefs.muted === true && Math.abs(prefs.ambience - 0.1) < 1e-9, JSON.stringify(prefs));
  // No audio at all: the game works the same.
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const err2 = [];
  p2.on('pageerror', (e) => err2.push(e.message));
  await p2.goto(`${base}/?fresh&debug&mute&seed=12`);
  await p2.waitForTimeout(1200);
  await p2.click('#start-game');
  await p2.waitForTimeout(400);
  await p2.click('#hud-new-project');
  await p2.waitForTimeout(300);
  check('without audio the game works the same', (await p2.isVisible('#start-project')) && !(await p2.evaluate(() => window.__empires.sound.ready)) && err2.length === 0, err2.join(' | '));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
