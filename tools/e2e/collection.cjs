/**
 * Collection e2e (0.19.0, D-067/D-068): every released game has its box (its
 * own look) on the shelves and in the game cabinet; milestones unlock real
 * keepsakes (the framed cover shows the first game); "Your games" shows covers,
 * versions and sales; the team's ideas appear in the new-game dialog and a
 * game can follow one.
 * Usage: node tools/e2e/collection.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-collection';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const closeAll = async () => { for (let i = 0; i < 6 && (await page.isVisible('.backdrop')); i++) { if (await page.isVisible('.card .close')) await page.click('.card .close'); else await page.keyboard.press('1'); await page.waitForTimeout(250); } };
  await page.goto(`${base}/?fresh&debug&seed=31`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.waitForTimeout(500);
  // Three games of different topics, one medium; then a game cabinet.
  await page.evaluate(() => {
    const E = window.__empires, g = E.game, s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' }); E.unlockAll(); s.company.money = 90000;
    const play = (name, topicId, size) => {
      g.dispatch({ type: 'start_project', name, topicId, size, focus: 0.6, budget: 500, days: size === 'medium' ? 70 : 35, price: 9.99 });
      for (let i = 0; i < 30000 && g.state.activeProjectId; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[0].id }); else E.advance(1); }
    };
    play('Isla', 'pirates', 'small'); play('Turbo', 'kart', 'small'); play('Bots', 'robots', 'medium');
    s.projects.find((p) => p.name === 'Turbo').result.averageScore = 8.4; // a hit: gold seal
    let ok = false;
    for (let z = 0; z < s.office.d && !ok; z++) for (let x = 0; x < s.office.w && !ok; x++) for (const rot of [0, 1, 2, 3]) if (!ok) ok = g.dispatch({ type: 'buy_item', defId: 'game_cabinet', x, z, rot }).ok;
    E.play(8 * 2);
  });
  await page.waitForTimeout(1500);
  await closeAll();
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.waitForTimeout(500);
  const boxes = await page.evaluate(() => [...window.__empires.scene.productBoxes.values()].map((b) => !!b.mesh.parent));
  check('every released game has its box on display', boxes.length === 3 && boxes.every(Boolean), JSON.stringify(boxes));
  const looks = await page.evaluate(() => new Set([...window.__empires.scene.productBoxes.values()].map((b) => b.key.split('|')[1])).size);
  check('…each with its own look (topic, seal, size)', looks === 3);
  await page.screenshot({ path: path.join(out, 'office-boxes.png') });
  // A keepsake of a real milestone: the framed cover of the first game.
  const unlockedCover = await page.evaluate(() => window.__empires.game.state.story.achievements.first_release !== undefined);
  check('the first release unlocked its keepsake (framed cover)', unlockedCover);
  const placed = await page.evaluate(() => { const g = window.__empires.game, s = g.state; let ok = false; for (let z = 0; z < s.office.d && !ok; z++) for (let x = 0; x < s.office.w && !ok; x++) if (!ok) ok = g.dispatch({ type: 'buy_item', defId: 'framed_cover', x, z, rot: 0 }).ok; return ok; });
  check('…and it can be placed in the office', placed);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, 'office-keepsake.png') });
  // "Your games": covers, versions, sales. (Results waiting in the queue open as windows close.)
  await page.waitForTimeout(500);
  await closeAll();
  await page.waitForTimeout(500);
  await closeAll();
  await page.click('#hud-products');
  await page.waitForTimeout(400);
  const cat = await page.evaluate(() => ({ covers: document.querySelectorAll('#products-card canvas.cover').length, versions: [...document.querySelectorAll('[data-version]')].map((e) => e.dataset.version) }));
  check('"Your games" shows each cover and its version', cat.covers === 3 && cat.versions.every((v) => v === '1.0'), JSON.stringify(cat));
  await page.screenshot({ path: path.join(out, 'catalogue.png') });
  await closeAll();
  // The team's ideas in the new-game dialog.
  await page.evaluate(() => { const s = window.__empires.game.state; s.company.inspirations = [{ id: 'I-e2e', day: s.day, kind: 'combo', source: 'chat', topicId: 'cooking', featureId: 'customization', by: s.founderId }]; window.__empires.ui.showNewProject(); });
  await page.waitForTimeout(400);
  check('the new-game dialog shows the team\'s ideas', await page.isVisible('[data-idea="I-e2e"]'));
  await page.click('[data-idea="I-e2e"]');
  await page.waitForTimeout(300);
  const follow = await page.evaluate(() => ({ topic: document.querySelector('.tile.on')?.dataset.topic, feat: !!document.querySelector('[data-feature="customization"].on'), on: !!document.querySelector('[data-idea="I-e2e"].on') }));
  check('…tapping one sets the plan to follow it', follow.topic === 'cooking' && follow.feat && follow.on, JSON.stringify(follow));
  await page.screenshot({ path: path.join(out, 'ideas.png') });
  await page.click('[data-topic="kart"]');
  await page.waitForTimeout(200);
  check('…changing the plan away from it un-follows it', !(await page.isVisible('[data-idea="I-e2e"].on')));
  await page.click('[data-idea="I-e2e"]');
  await page.click('#start-project');
  await page.waitForTimeout(500);
  const used = await page.evaluate(() => { const s = window.__empires.game.state; const p = s.projects.find((q) => q.id === s.activeProjectId); return { left: (s.company.inspirations ?? []).length, mods: p.ceilingMods.length, topic: p.topicId }; });
  check('…and the game starts following it (the idea is used up)', used.left === 0 && used.topic === 'cooking' && used.mods >= 1, JSON.stringify(used));
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
