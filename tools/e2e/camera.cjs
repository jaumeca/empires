/**
 * Camera & decoration QoL e2e (0.21.0): drag to pan, smooth wheel zoom,
 * orbit, "whole office" button, look closer / follow from the character card,
 * all of it while the world is paused too; decoration undo (exact money);
 * phone: one-finger drag pans, buttons big enough.
 * Usage: node tools/e2e/camera.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-camera';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cam = () => page.evaluate(() => { const r = window.__empires.scene.rig; return { cur: { ...r.cur }, want: { ...r.want }, follow: r.followId, moved: r.moved }; });
  const settle = () => page.waitForFunction(() => { const r = window.__empires.scene.rig; return ['panX', 'panZ', 'zoom', 'yaw'].every((k) => Math.abs(r.cur[k] - r.want[k]) < 1e-3); }, null, { timeout: 15000 });
  await page.goto(`${base}/?fresh&debug&seed=21`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.ui.setSpeed(0); });
  await page.waitForTimeout(300);
  check('no "whole office" button while the view is the default one', !(await page.isVisible('#cam-overview')));
  // Smooth wheel zoom, paused.
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, -400);
  const z1 = await cam();
  check('wheel zoom eases in (not instant) even while paused', z1.want.zoom > 1.05 && z1.cur.zoom < z1.want.zoom + 1e-6, JSON.stringify(z1));
  await settle();
  // Drag to pan.
  const before = await cam();
  await page.mouse.move(700, 500); await page.mouse.down(); await page.mouse.move(640, 470, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(100);
  const after = await cam();
  check('dragging the office pans the view', Math.hypot(after.want.panX - before.want.panX, after.want.panZ - before.want.panZ) > 0.05, JSON.stringify(after.want));
  check('…and a drag is not a tap (no window opened)', !(await page.isVisible('.backdrop')));
  await page.keyboard.press('q');
  check('Q orbits gently', (await cam()).want.yaw > 0);
  await settle();
  check('the "whole office" button appears once the view moved', await page.isVisible('#cam-overview'));
  await page.screenshot({ path: path.join(out, 'camera-moved.png') });
  await page.click('#cam-overview');
  await settle();
  const ov = await cam();
  check('…and brings back the default view', !ov.moved && Math.abs(ov.cur.zoom - 1) < 0.01, JSON.stringify(ov.cur));
  // Look closer / follow from the character card.
  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  await page.click('#cam-follow');
  await page.waitForTimeout(200);
  const fo = await cam();
  check('"Follow" from the character card follows the founder', fo.follow === (await page.evaluate(() => window.__empires.game.state.founderId)) && fo.want.zoom > 1.2);
  check('…the button now offers to stop following', /seguir|following/i.test(await page.textContent('#cam-overview')));
  await page.keyboard.press('Escape');
  check('Esc stops following', (await cam()).follow === null);
  await page.keyboard.press('0');
  await settle();
  // Decoration undo.
  await page.evaluate(() => { window.__empires.unlockAll(); window.__empires.game.state.company.money = 9000; });
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  const m0 = await page.evaluate(() => ({ money: window.__empires.game.state.company.money, n: window.__empires.game.state.office.items.length }));
  await page.evaluate(() => { const g = window.__empires.game, s = g.state; for (let z = 0; z < s.office.d; z++) for (let x = 0; x < s.office.w; x++) if (g.dispatch({ type: 'buy_item', defId: 'plant_small', x, z, rot: 0 }).ok) return; });
  await page.evaluate(() => window.__empires.ui.decor.render?.());
  await page.waitForTimeout(300);
  check('after a purchase, "Undo" is offered', await page.isVisible('#decor-undo'));
  await page.click('#decor-undo');
  await page.waitForTimeout(300);
  const m1 = await page.evaluate(() => ({ money: window.__empires.game.state.company.money, n: window.__empires.game.state.office.items.length }));
  check('undo gives back exactly the money and removes the object', m1.money === m0.money && m1.n === m0.n, `${JSON.stringify(m0)} → ${JSON.stringify(m1)}`);
  check('…and there is nothing left to undo', !(await page.isVisible('#decor-undo')));
  await page.keyboard.press('Escape');
  // Phone: one-finger drag pans; buttons are big enough.
  const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await phone.goto(`${base}/?fresh&debug&seed=22`);
  await phone.waitForTimeout(1500);
  await phone.tap('#start-game');
  await phone.waitForTimeout(500);
  await phone.evaluate(() => { window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.ui.setSpeed(0); window.__empires.scene.rig.setZoom(2); });
  await phone.waitForTimeout(1500);
  const p0 = await phone.evaluate(() => ({ ...window.__empires.scene.rig.want }));
  await phone.evaluate(() => {
    const el = document.querySelector('canvas');
    const ev = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', 420, 200); for (let i = 1; i <= 8; i++) ev('pointermove', 420 - i * 8, 200 - i * 4); ev('pointerup', 356, 168);
  });
  const p1 = await phone.evaluate(() => ({ ...window.__empires.scene.rig.want }));
  check('phone: a one-finger drag pans the view', Math.hypot(p1.panX - p0.panX, p1.panZ - p0.panZ) > 0.05, `${JSON.stringify(p0)} → ${JSON.stringify(p1)}`);
  const small = await phone.evaluate(() => [...document.querySelectorAll('#ui button')].filter((b) => b.offsetParent && !b.closest('.diag')).map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0 && Math.min(r.width, r.height) < 30).length);
  check('phone: no visible button smaller than 30 px', small === 0, `${small} small`);
  await phone.screenshot({ path: path.join(out, 'phone.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
