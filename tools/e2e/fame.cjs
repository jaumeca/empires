/**
 * Reputation e2e (F3.8 / D-059): the studio Story says in words what players and
 * clients think, the next game's plan shows the players' trust (or doubts), and
 * the track record survives save/load.
 * Usage: node tools/e2e/fame.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-fame';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const closeCards = async () => { for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); } };
  await page.goto(`${base}/?fresh&debug&seed=96`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => window.__empires.game.dispatch({ type: 'tutorial', action: 'skip' }));
  await page.keyboard.press('h'); await page.waitForTimeout(300);
  check('a new studio has no reputation yet (and says how it is earned)', /Todavía sin fama|No reputation yet/.test(await page.textContent('#story-fame')));
  await closeCards();
  // A studio with a history: famous for quality, but late with dates.
  await page.evaluate(() => { window.__empires.game.state.company.fame = { quality: 7, reliability: -6, innovation: 2 }; });
  await page.keyboard.press('h'); await page.waitForTimeout(300);
  const txt = await page.textContent('#story-fame');
  check('the Story says what people think, in words', /Famosos por su calidad|Famous for quality/.test(txt) && /impuntuales|late/.test(txt) && !/\d/.test(txt.replace(/\s/g, '')), txt);
  check('…good and bad things look different', (await page.locator('#story-fame [data-fame="quality"].good').count()) === 1 && (await page.locator('#story-fame [data-fame="reliability"].bad').count()) === 1);
  await page.screenshot({ path: path.join(out, 'story-fame.png') });
  await closeCards();
  await page.keyboard.press('p'); await page.waitForTimeout(400);
  check('the next game starts with the players\' trust', /confían|trust/.test(await page.textContent('#np-fame')));
  await closeCards();
  await page.evaluate(() => { window.__empires.game.state.company.fame.quality = -7; });
  await page.keyboard.press('p'); await page.waitForTimeout(400);
  check('…or with their doubts', /desconfían|wary/.test(await page.textContent('#np-fame')));
  await page.screenshot({ path: path.join(out, 'new-project-doubt.png') });
  await closeCards();
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  const back = await page.evaluate(() => window.__empires.game.state.company.fame);
  check('the track record survives save/load', back && back.quality === -7 && back.reliability === -6);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
