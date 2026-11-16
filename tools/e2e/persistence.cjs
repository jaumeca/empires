/**
 * Production-like persistence e2e (no ?debug): saves survive reloads and
 * "updates", ?fresh in a normal URL cannot wipe a game, old saves migrate,
 * debug sessions are sandboxed, the version is visible in the menu.
 * Usage: node tools/e2e/persistence.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-persistence';
fs.mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const company = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('empires.save.auto')).state.company.name; } catch { return null; } });
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 1. A v1 save from the first web version (as if stored by an older deploy) loads and migrates.
  const v1 = fs.readFileSync(path.join(__dirname, '../../tests/fixtures/save-v1-released.empires'), 'utf8');
  await page.goto(base + '/');
  await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('empires.save.auto', t); }, v1);
  await page.goto(base + '/');
  await page.waitForTimeout(2000);
  const hud = await page.textContent('#ui');
  const v1Name = JSON.parse(v1).state.company.name;
  check('old v1 save loads after an update', hud.includes(v1Name), v1Name);
  check('no founder-creation screen for an existing game', !(await page.isVisible('#start-game')));

  // 2. Closing / hiding the page saves (migrated to the current schema).
  await page.click('[data-speed="1"]');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const schema = await page.evaluate(() => JSON.parse(localStorage.getItem('empires.save.auto')).schemaVersion);
  check('hiding the page saves in the current format', schema >= 7, `schema ${schema}`);

  // 3. ?fresh, ?seed in a normal URL do nothing.
  await page.goto(base + '/?fresh&seed=3');
  await page.waitForTimeout(1500);
  check('?fresh without debug keeps the game', (await page.textContent('#ui')).includes(v1Name) && (await company(page)) === v1Name);

  // 4. Debug sessions are sandboxed.
  await page.goto(base + '/?debug&fresh&seed=4');
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => window.__empires.ui.toast('x'));
  await page.click('#hud-menu');
  await page.click('text=Guardar ahora');
  check('debug game saved in its own slot', await page.evaluate(() => !!localStorage.getItem('empires.debug.save.auto')));
  check('real game untouched by the debug session', (await company(page)) === v1Name);

  // 5. Version visible in the menu.
  await page.goto(base + '/');
  await page.waitForTimeout(1500);
  await page.click('#hud-menu');
  const ver = await page.textContent('#menu-version');
  check('version and commit shown in the menu', /v\d+\.\d+\.\d+ · \w+/.test(ver), ver);
  await page.screenshot({ path: path.join(out, 'menu-version.png') });

  // 6. Export → wipe storage → import restores the game.
  await page.click('.card .close');
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#hud-menu'); await page.click('text=Exportar partida'); })()]);
  const file = path.join(out, 'export.empires');
  await dl.saveAs(file);
  // Wipe from a sandboxed debug page (a normal page saves itself again when it closes).
  await page.goto(base + '/?debug');
  await page.waitForTimeout(800);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('empires.save.')) localStorage.removeItem(k); });
  await page.goto(base + '/');
  await page.waitForTimeout(1500);
  check('empty storage starts a new game', await page.isVisible('#start-game'));
  await page.click('#start-game');
  await page.click('#hud-menu');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Importar partida')]);
  await chooser.setFiles(file);
  await page.waitForTimeout(2500);
  check('import restores the exported game', (await company(page)) === v1Name && (await page.textContent('#ui')).includes(v1Name));

  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
