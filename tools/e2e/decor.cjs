/**
 * Decoration mode e2e (LS.3): buy + place with a touch tap, install a computer,
 * move, rotate, sell; checks the simulation state after each step.
 * Usage: node tools/e2e/decor.cjs http://localhost:4173 <screenshotDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-e2e';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=4`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => { window.__empires.game.state.company.money = 20000; });
  await page.waitForTimeout(500);

  await page.tap('#hud-decor');
  await page.waitForTimeout(400);
  check('decor mode opens and pauses', (await page.isVisible('.decor-sheet')) && (await page.evaluate(() => window.__empires.game.clock.speed)) === 0);
  await page.screenshot({ path: path.join(out, 'decor-catalog.png') });

  // Buy a tall plant and place it with a touch tap on the floor.
  await page.tap('[data-cat="plant"]');
  await page.tap('[data-buy="plant_tall"]');
  await page.waitForTimeout(300);
  const cell = await page.evaluate(() => window.__empires.scene.cellScreenPos(0, 6));
  await page.touchscreen.tap(cell.x, cell.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'decor-ghost.png') });
  const confirmEnabled = await page.isEnabled('#decor-confirm');
  await page.tap('#decor-confirm');
  await page.waitForTimeout(400);
  let s = await st();
  const plant = s.office.items.find((i) => i.defId === 'plant_tall');
  check('tall plant bought and placed where tapped', !!plant && plant.x === 0 && plant.z === 6 && confirmEnabled, plant ? `${plant.x},${plant.z}` : 'none');
  check('money charged', s.company.money === 20000 - 160, String(s.company.money));

  // Install a developer computer on the only desk.
  await page.tap('[data-cat="computer"]');
  await page.tap('[data-buy="pc_dev"]');
  await page.waitForTimeout(300);
  s = await st();
  const desk = s.office.items.find((i) => i.defId === 'desk_basic');
  check('computer installed on the desk', desk.mounts.computer === 'pc_dev');

  // Select the plant, move it, sell it.
  await page.evaluate((uid) => window.__empires.ui.decor.onTap({ kind: 'item', uid }), plant.uid);
  await page.waitForTimeout(200);
  await page.tap('#decor-move');
  const cell2 = await page.evaluate(() => window.__empires.scene.cellScreenPos(5, 6));
  await page.touchscreen.tap(cell2.x, cell2.y);
  await page.waitForTimeout(300);
  await page.tap('#decor-confirm');
  await page.waitForTimeout(300);
  s = await st();
  const moved = s.office.items.find((i) => i.uid === plant.uid);
  check('plant moved with a tap', moved && moved.x === 5 && moved.z === 6, moved ? `${moved.x},${moved.z}` : 'none');
  await page.evaluate((uid) => window.__empires.ui.decor.onTap({ kind: 'item', uid }), plant.uid);
  await page.waitForTimeout(200);
  await page.tap('#decor-sell');
  await page.waitForTimeout(300);
  s = await st();
  check('plant sold for half its price', !s.office.items.some((i) => i.uid === plant.uid) && s.company.money === 20000 - 160 - 1400 + 150 + 80, String(s.company.money));

  // An invalid spot shows a red ghost and cannot be confirmed.
  await page.tap('[data-cat="comfort"]');
  await page.tap('[data-buy="sofa"]');
  await page.waitForTimeout(200);
  const bad = await page.evaluate(() => window.__empires.scene.cellScreenPos(3, 0));
  await page.touchscreen.tap(bad.x, bad.y);
  await page.waitForTimeout(300);
  check('invalid placement cannot be confirmed', !(await page.isEnabled('#decor-confirm')));
  await page.screenshot({ path: path.join(out, 'decor-invalid.png') });
  await page.tap('text=Cancelar');

  await page.tap('#decor-done');
  await page.waitForTimeout(300);
  check('decor mode closes', !(await page.isVisible('.decor-sheet')));
  // Reload keeps the office.
  await page.click('#hud-menu');
  await page.click('text=Guardar ahora');
  const before = (await st()).office;
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(2000);
  check('office persists after reload', JSON.stringify((await st()).office) === JSON.stringify(before));
  await page.screenshot({ path: path.join(out, 'decor-after-reload.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  process.exit(checks.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
