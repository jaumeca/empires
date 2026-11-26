/**
 * Story e2e (ML.2/ML.3): the shelf opens the studio story; releases become
 * memories; a product box tells its story; achievements unlock trophies that
 * can be placed in the office.
 * Usage: node tools/e2e/story.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-story';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  const answerAll = async () => { for (let i = 0; i < 10 && (await page.evaluate(() => !!window.__empires.game.state.pendingDecision)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(200); } };
  await page.goto(`${base}/?fresh&debug&seed=31`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  check('H opens the studio story with the founding memory', await page.isVisible('.card.story') && (await page.locator('[data-memory="founded"]').count()) === 1);
  // 0.19.0: nine (first release, ten games and first update added as physical memories).
  check('nine achievements to discover', (await page.locator('.achievement').count()) === 9 && (await page.locator('.achievement.on').count()) === 0);
  await page.keyboard.press('Escape');

  // Ship a game (fast-forward), then the memory appears.
  await page.keyboard.press('p');
  await page.click('#start-project');
  for (let i = 0; i < 400 && (await page.evaluate(() => !!window.__empires.game.state.activeProjectId)); i++) {
    await page.evaluate(() => window.__empires.advance(40));
    await answerAll();
    if (await page.isVisible('[data-option="release"]')) await page.click('[data-option="release"]');
  }
  await page.evaluate(() => window.__empires.advance(8 * 3));
  await page.waitForTimeout(300);
  if (await page.isVisible('.card .close')) await page.click('.card .close');
  let s = await st();
  check('first release remembered', s.story.memories.some((m) => m.kind === 'first_release'));

  // Tap the bookshelf → story.
  // (Picking of the shelf mesh is covered by the scene since v0.1; here, what a tap on it does.)
  // The results card opens ~1.8 s after a launch: give delayed cards time to appear, then close them.
  for (let i = 0; i < 12; i++) { if (await page.isVisible('.backdrop')) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await answerAll(); } await page.waitForTimeout(250); }
  await page.evaluate(() => window.__empires.scene.onTap({ kind: 'shelf' }));
  await page.waitForTimeout(400);
  const viaShelf = await page.isVisible('.card.story');
  if (!viaShelf) console.log('SHELFDBG', await page.evaluate(() => JSON.stringify({ modal: document.querySelector('.backdrop')?.className, card: document.querySelector('.card')?.className, text: document.querySelector('.card')?.textContent?.slice(0, 120), pend: window.__empires.game.state.pendingDecision?.kind })));
  if (viaShelf) await page.keyboard.press('Escape');
  check('the bookshelf opens the story', viaShelf);

  // Product box → its story.
  await page.evaluate((id) => window.__empires.ui.showResults(id), s.projects[0].id);
  await page.waitForTimeout(300);
  check('the product shows its own story', (await page.locator('.card .memories [data-memory]').count()) >= 1);
  await page.screenshot({ path: path.join(out, 'product-story.png') });
  await page.keyboard.press('Escape');

  // An achievement unlocks a trophy; it can be placed.
  await page.evaluate(() => { const s = window.__empires.game.state; s.company.money = 150000; });
  await page.evaluate(() => window.__empires.play(8));
  await page.waitForTimeout(300);
  s = await st();
  check('reaching 100.000 € unlocks the neon sign', s.story.achievements.rich !== undefined);
  await page.keyboard.press('d');
  await page.click('[data-cat="awards"]');
  await page.waitForTimeout(200);
  // Earned so far: first release and 100.000 € → 7 still locked.
  check('locked trophies show how to earn them', (await page.locator('.decor-item.unearned').count()) === 7, String(await page.locator('.decor-item.unearned').count()));
  await page.screenshot({ path: path.join(out, 'awards-tab.png') });
  await page.click('[data-buy="neon_sign"]');
  let placed = false;
  for (const [cx, cz] of [[5, 1], [6, 2], [1, 7], [5, 7], [6, 6], [4, 3]]) {
    const c = await page.evaluate(([x, z]) => window.__empires.scene.cellScreenPos(x, z), [cx, cz]);
    await page.mouse.move(c.x, c.y); await page.waitForTimeout(200);
    if (await page.isEnabled('#decor-confirm')) { await page.mouse.click(c.x, c.y); placed = true; break; }
  }
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  s = await st();
  check('earned decoration placed in the office', placed && s.office.items.some((i) => i.defId === 'neon_sign'));
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  check('the achievement appears in the story', (await page.locator('.achievement.on').count()) >= 1);
  await page.screenshot({ path: path.join(out, 'story.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
