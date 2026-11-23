/**
 * End-to-end playthrough of the first playable loop through the real UI.
 * Requires a running server (npm run dev / preview). Usage:
 *   node tools/e2e/play.cjs http://localhost:5173 <screenshotDir>
 * Exits with code 1 if any check fails.
 */
const { chromium } = require('playwright');
const path = require('path');

const base = process.argv[2] || 'http://localhost:5173';
const outDir = process.argv[3] || 'docs/screenshots';
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = (name) => page.screenshot({ path: path.join(outDir, name) });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));

  await page.goto(`${base}/?fresh&debug&seed=42`);
  await page.waitForTimeout(2500);
  check('founder creation is shown on a new game', await page.isVisible('#start-game'));
  await page.fill('input[placeholder="Nombre de tu Empirian"]', 'Nora');
  await page.fill('input[placeholder="Nombre del estudio (opcional)"]', 'Nube Games');
  await page.click('button[aria-label="hairStyle 1"]').catch(() => {});
  await page.click('button[aria-label="skin 4"]');
  await page.click('button[aria-label="hairColor 9"]');
  await page.click('button[aria-label="topColor 3"]');
  await page.click('.stepper button[aria-label="Siguiente"]'); // hair style
  await page.waitForTimeout(800);
  await shot('01-founder-creation.png');
  await page.click('#start-game');
  await page.waitForTimeout(2500);
  let s = await st();
  check('founder customized via command', s.setupComplete && s.empirians[0].name === 'Nora' && s.empirians[0].appearance.skin === 3, JSON.stringify(s.empirians[0].appearance));
  await shot('02-room.png');

  await page.click('#hud-new-project');
  await page.waitForTimeout(600);
  await page.click('[data-topic="kart"]');
  await shot('03-new-project.png');
  await page.click('#start-project');
  await page.waitForTimeout(500);
  s = await st();
  check('project started', s.activeProjectId !== null && s.projects[0].topicId === 'kart');

  // Time controls
  await page.click('[data-speed="0"]');
  const t0 = (await st()).tick;
  await page.waitForTimeout(1200);
  check('pause stops simulated time', (await st()).tick === t0);
  await page.click('[data-speed="4"]');
  await page.waitForTimeout(1500);
  check('4x speed advances time', (await st()).tick > t0);

  await page.evaluate(() => window.__empires.advance(60));
  await page.waitForTimeout(4000); // let the Empirian walk to the desk
  await shot('04-working.png');
  const bubbles = await page.evaluate(() => window.__empires.scene.bubbles.activeIcons());
  check('bubbles appear from simulation events', bubbles.length > 0, bubbles.join(','));

  let decisionShot = false;
  let decisions = 0;
  const kinds = new Set();
  for (let i = 0; i < 400; i++) {
    s = await st();
    const p = s.projects[0];
    if (p.phase === 'released') break;
    if (await page.isVisible('.decision')) {
      if (!decisionShot) { await shot('05-decision.png'); decisionShot = true; }
      const kind = s.pendingDecision && s.pendingDecision.kind;
      await page.click(kind === 'big_idea' ? '[data-option="approve"]' : kind === 'deadline' ? '[data-option="release"]' : '.option >> nth=0');
      kinds.add(kind);
      decisions++;
      await page.waitForTimeout(300);
      continue;
    }
    if (p.phase === 'polish' && p.polishDone > 30) {
      if (await page.isVisible('.backdrop')) await page.click('.card .close').catch(() => {});
      await page.click('#hud-release', { force: true });
      await page.waitForTimeout(400);
      await page.click('#confirm-release');
      break;
    }
    if (s.pendingDecision) { await page.waitForTimeout(800); continue; }
    await page.evaluate(() => window.__empires.advance(40));
    await page.waitForTimeout(60);
  }
  check('at least one decision was taken through the UI', decisions >= 1, `decisions=${decisions}`);
  check('contextual moments appear (polish plan)', kinds.has('polish_plan'), [...kinds].join(','));
  const ledgerKinds = (await st()).ledger.map((e) => e.kind);
  check('decision recorded in the causal ledger', ledgerKinds.includes('decision') || ledgerKinds.includes('delay'), ledgerKinds.join(','));
  await page.waitForTimeout(700);
  await shot('06-release-party.png');
  await page.waitForTimeout(2500);
  s = await st();
  check('product released with reviews', s.projects[0].phase === 'released' && s.projects[0].result.reviews.length === 4, `score=${s.projects[0].result && s.projects[0].result.averageScore}`);
  check('results card visible', await page.isVisible('.score-big'));
  check('explanation shown', (await page.locator('.why li').count()) > 0);
  await shot('07-results.png');

  const moneyBefore = s.company.money;
  await page.evaluate(() => { for (let i = 0; i < 8 * 7 * 4; i++) window.__empires.game.tick(); });
  await page.waitForTimeout(800);
  s = await st();
  check('sales generate money over the following weeks', s.company.money > moneyBefore && s.projects[0].result.totalUnits > 0, `units=${s.projects[0].result.totalUnits}`);
  // A decision (e.g. a critic) may be asking instead of the results card: answer it, then close what's left.
  for (let i = 0; i < 4 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(300); }
  if (await page.isVisible('.card .close')) await page.click('.card .close');
  await page.waitForTimeout(1500);
  await shot('08-shelf-box.png');
  const boxes = await page.evaluate(() => window.__empires.scene.productBoxes.size);
  check('collectible box on the shelf', boxes === 1);

  // Save & reload (a story event, e.g. a critic, may be asking first: answer it).
  const pendingKind = await page.evaluate(() => window.__empires.game.state.pendingDecision?.kind || '');
  if (pendingKind) console.log('pending before save:', pendingKind);
  for (let i = 0; i < 4 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(300); }
  for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); }
  await page.click('[data-speed="0"]');
  await page.click('button[aria-label="Menú"]');
  await page.click('text=Guardar ahora');
  const before = await st();
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(2500);
  const after = await st();
  check('save + reload restores the exact state', JSON.stringify(before) === JSON.stringify(after), `tick ${before.tick} -> ${after.tick}`);
  check('collectible persists after reload', (await page.evaluate(() => window.__empires.scene.productBoxes.size)) === 1);
  await shot('09-after-reload.png');

  // Export + import through the real UI (file download / file chooser)
  await page.click('button[aria-label="Menú"]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('text=Exportar partida')]);
  const exportPath = path.join(outDir, '_export.empires');
  await download.saveAs(exportPath);
  const exported = JSON.parse(require('fs').readFileSync(exportPath, 'utf8'));
  check('export produces a versioned save file', exported.format === 'empires-save' && exported.state.tick === after.tick);
  await page.click('.card .close');
  await page.evaluate(() => { for (let i = 0; i < 80; i++) window.__empires.game.tick(); });
  await page.click('button[aria-label="Menú"]');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Importar partida')]);
  await Promise.all([page.waitForNavigation(), chooser.setFiles(exportPath)]);
  await page.waitForTimeout(2500);
  const imported = await st();
  check('import restores the exported game', imported.tick === after.tick && JSON.stringify(imported) === JSON.stringify(after), `tick ${imported.tick}`);
  require('fs').unlinkSync(exportPath);

  // Corrupted autosave in the browser → recovered from backup with a notice
  await page.evaluate(() => { window.__empires.game.clock.setSpeed(0); for (let i = 0; i < 16; i++) window.__empires.game.tick(); });
  await page.click('#hud-menu');
  await page.click('text=Guardar ahora'); // auto = newest, auto.bak1 = previous
  const beforeCorrupt = await st();
  // Leave the game first (its hide-autosave runs), then damage the save "at rest"
  // from another page of the same origin, like a crash or a bad disk write would.
  const cssAsset = require('fs').readdirSync('dist/assets').find((f) => f.endsWith('.css'));
  await page.goto(`${base}/assets/${cssAsset}`); // a static file of the same origin (no game code)
  await page.evaluate(() => { const k = 'empires.debug.save.auto'; localStorage.setItem(k, localStorage.getItem(k).replace('"money":', '"money":7')); });
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(2500);
  const recovered = await st();
  const toastText = await page.locator('.toast').allInnerTexts();
  check('corrupted autosave is recovered from a backup', recovered.tick > 0 && recovered.tick <= beforeCorrupt.tick && toastText.some((x) => x.includes('copia de seguridad')), `tick ${recovered.tick} / ${beforeCorrupt.tick}`);
  check('damaged save is kept in quarantine', await page.evaluate(() => !!localStorage.getItem('empires.debug.save.quarantine.auto')));

  // Portrait/phone sizes
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  await shot('10-phone-landscape.png');
  await page.click('#hud-new-project');
  await page.waitForTimeout(600);
  await shot('12-phone-new-project.png');
  await page.click('.card .close');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await shot('11-phone-portrait.png');

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
