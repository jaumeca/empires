/**
 * Identity e2e (AW.C.1/C.2): the character sheet sits beside the office with
 * real facts; the editor changes looks, name and nickname without touching
 * skills, personality or history; cancel restores; employees can be edited too.
 * Usage: node tools/e2e/identity.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-identity';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  await page.goto(`${base}/?fresh&debug&seed=60`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  await page.evaluate(() => {
    const g = window.__empires.game;
    g.dispatch({ type: 'tutorial', action: 'skip' }); window.__empires.unlockAll(); /* tests the mechanic, not when it unlocks (D-062) */
    const s = g.state;
    s.company.money = 50000;
    for (let z = 0; z < 8; z++) for (let x = 0; x < 10; x++) for (const rot of [0, 1, 2, 3]) if (s.office.items.filter((i) => i.defId.startsWith('desk')).length < 2) g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot });
    s.contracts.completed = 1;
    s.hiring.candidates.push({ id: 'H-id', name: 'Teo', appearance: { skin: 2, hairStyle: 1, hairColor: 3, top: 2, topColor: 4, pantsColor: 1, accessory: 0 }, baseSkills: { tech: 6, design: 4, creativity: 5, management: 4 }, trait: 'curious', salary: 500, expiresDay: 99 });
    g.dispatch({ type: 'hire', candidateId: 'H-id' });
  });
  await page.waitForTimeout(500);

  // Character sheet beside the office.
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { left: r.left, width: innerWidth }; });
  check('sheet opens beside the office (desktop)', box.left > box.width * 0.45, `${Math.round(box.left)} / ${box.width}`);
  const bio = await page.textContent('.sheet .bio');
  check('biography from real facts (founder, strength)', /Fundó|Founded/.test(bio) && /punto fuerte|Strength/.test(bio), bio.slice(0, 90));
  check('current task, seniority and story sections', (await page.isVisible('.sheet .task')) && /desde el día|since day/.test(await page.textContent('.sheet')));
  await page.screenshot({ path: path.join(out, 'sheet.png') });

  // Edit the founder.
  const before = await st();
  await page.click('#edit-empirian');
  await page.waitForTimeout(400);
  check('editor opens with the character in front', await page.isVisible('.card.editor'));
  await page.fill('#editor-name', 'Ada');
  await page.fill('#editor-nickname', 'Byte');
  await page.click('.card.editor [data-step="hairStyle"]');
  await page.click('.card.editor [data-step="accessory"]');
  await page.screenshot({ path: path.join(out, 'editor.png') });
  await page.click('#editor-save');
  await page.waitForTimeout(500);
  let s = await st();
  const f0 = before.empirians[0], f1 = s.empirians[0];
  check('name, nickname and looks changed', f1.name === 'Ada' && f1.nickname === 'Byte' && f1.appearance.hairStyle !== f0.appearance.hairStyle && f1.appearance.accessory !== f0.appearance.accessory);
  check('skills, experience and memories untouched', JSON.stringify([f1.skills, f1.xp, f1.topicXp]) === JSON.stringify([f0.skills, f0.xp, f0.topicXp]) && JSON.stringify(s.story) === JSON.stringify(before.story));
  check('the office model shows the new look', await page.evaluate((a) => window.__empires.scene.actors.get(window.__empires.game.state.founderId).appearanceKey === JSON.stringify(a), f1.appearance));
  check('everyone back in the office after editing', await page.evaluate(() => [...window.__empires.scene.actors.values()].every((a) => a.view.root.visible && !a.savedPos)));

  // Cancel restores; employees can be edited.
  const emp = s.empirians.find((e) => e.name === 'Teo');
  await page.evaluate((id) => window.__empires.ui.showEditor(id), emp.id);
  await page.waitForTimeout(300);
  check('editing an employee shows only them', await page.evaluate((id) => [...window.__empires.scene.actors.entries()].every(([k, a]) => a.view.root.visible === (k === id)), emp.id));
  await page.click('.card.editor [data-step="top"]');
  await page.click('#editor-cancel');
  await page.waitForTimeout(400);
  s = await st();
  const e2 = s.empirians.find((e) => e.id === emp.id);
  check('cancel keeps the employee as they were', JSON.stringify(e2.appearance) === JSON.stringify(emp.appearance) && e2.trait === 'curious' && e2.salary === 500);
  check('…and the model is restored', await page.evaluate(([id, a]) => window.__empires.scene.actors.get(id).appearanceKey === JSON.stringify(a), [emp.id, emp.appearance]));

  // Persists.
  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1500);
  s = await st();
  check('edits survive save and reload', s.empirians[0].name === 'Ada' && s.empirians[0].nickname === 'Byte');
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
