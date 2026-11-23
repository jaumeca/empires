/**
 * First-minutes audit (progression): what a brand-new player sees at each step,
 * with a count of visible controls. Saves screenshots and a JSON summary.
 * Usage: node tools/e2e/firstminutes.cjs http://localhost:4173 <outDir> [label]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-firstminutes';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const summary = [];
  const count = async (step) => {
    const c = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
      const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
      const card = document.querySelector('.card');
      return {
        hudButtons: q('#ui > .hud button, .hud button, .hud-right button, .speed button').length,
        buttons: q('button').length,
        chips: q('.chip').length,
        inputs: q('input, select').length,
        cardWords: card ? card.textContent.trim().split(/\s+/).length : 0,
        locked: q('.locked, [disabled]').length,
      };
    });
    summary.push({ step, ...c });
    await page.screenshot({ path: path.join(out, `${String(summary.length).padStart(2, '0')}-${step}.png`) });
  };
  await page.goto(`${base}/?fresh&debug&seed=101`);
  await page.waitForTimeout(1800);
  await count('founder-creation');
  await page.click('#start-game');
  await page.waitForTimeout(1200);
  await count('office-first-look');
  // First game dialog.
  const opened = await page.evaluate(() => !!document.querySelector('#hud-new-project'));
  if (opened) await page.click('#hud-new-project');
  await page.waitForTimeout(600);
  await count('first-game-dialog');
  await page.click('#start-project');
  await page.waitForTimeout(800);
  for (let i = 0; i < 3 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(200); }
  await count('working-on-first-game');
  await page.click('.project-pill').catch(() => {});
  await page.waitForTimeout(400);
  await count('project-panel');
  for (let i = 0; i < 3 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(200); }
  await page.click('#hud-menu').catch(() => {});
  await page.waitForTimeout(300);
  await count('menu');
  for (let i = 0; i < 3 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(200); }
  await page.keyboard.press('d');
  await page.waitForTimeout(400);
  await count('decorate');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ errors, summary }, null, 2));
  console.log(JSON.stringify(summary));
  console.log('errors', errors.length);
  await browser.close();
})();
