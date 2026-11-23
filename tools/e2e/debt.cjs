/**
 * Technical debt e2e (F3.4 / D-057): the best coder proposes a shortcut (their
 * card, their voice), the project card shows the state of the code in words,
 * the next game's plan warns about inherited code, the decision is in the
 * Story, and everything survives save/load.
 * Usage: node tools/e2e/debt.cjs http://localhost:4173 <outDir>
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || '/tmp/empires-debt';
require('fs').mkdirSync(out, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__empires.game.state)));
  const closeCards = async () => { for (let i = 0; i < 4 && (await page.isVisible('.card .close')); i++) { await page.click('.card .close'); await page.waitForTimeout(150); } };
  await page.goto(`${base}/?fresh&debug&seed=94`);
  await page.waitForTimeout(1500);
  await page.click('#start-game');
  const coder = await page.evaluate(() => {
    const g = window.__empires.game; const s = g.state;
    g.dispatch({ type: 'tutorial', action: 'skip' });
    s.company.money = 60000; s.contracts.completed = 1; s.eventLog.lastDay = 1e9;
    let ok = false;
    for (let z = 0; z < s.office.d && !ok; z++) for (let x = 0; x < s.office.w && !ok; x++) for (const rot of [0, 1, 2, 3]) if (!ok) ok = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: 'H-code', name: 'Kai', appearance: { skin: 1, hairStyle: 6, hairColor: 2, top: 4, topColor: 6, pantsColor: 3, accessory: 3 }, baseSkills: { tech: 8, design: 4, creativity: 5, management: 4 }, trait: 'curious', salary: 600, expiresDay: 99 });
    g.dispatch({ type: 'hire', candidateId: 'H-code' });
    // One team proposal per project (D-058): pick the project id that gets the code shortcut (test only).
    const hashUnit = (seed, a, b) => { let h = 2166136261 ^ seed; for (const ch of `${a}|${b}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
    while (hashUnit(s.seed, `P-${s.nextId}`, 'proposal') >= 0.5) s.nextId++;
    g.dispatch({ type: 'start_project', name: 'Atajos', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
    // Run until the shortcut question (answering anything else sensibly).
    for (let i = 0; i < 20000; i++) {
      const d = s.pendingDecision;
      if (d && d.kind === 'tech_shortcut') break;
      if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'polish_plan' ? 'balanced' : d.kind === 'big_idea' ? 'keep' : d.options[0].id });
      else g.tick();
    }
    return s.empirians.find((e) => e.name === 'Kai').id;
  });
  await page.waitForTimeout(1600);
  let s = await st();
  check('the best coder proposes a shortcut', s.pendingDecision?.kind === 'tech_shortcut' && s.pendingDecision.speakerId === coder);
  const card = await page.textContent('.card');
  check('the card offers shortcut, doing it properly or a solid base', /Atajo|Shortcut/.test(card) && /base sólida|solid/i.test(card), card.slice(0, 100));
  await page.screenshot({ path: path.join(out, 'shortcut.png') });
  const req0 = s.projects[0].requiredPoints;
  await page.keyboard.press('1');
  await page.waitForTimeout(400);
  s = await st();
  check('taking the shortcut: less work now, more debt', !s.pendingDecision && s.projects[0].requiredPoints < req0 && s.projects[0].debt >= 12);
  check('…remembered in the Story with who proposed it', s.story.memories.some((m) => m.text.key === 'ledger.moment.tech_shortcut.shortcut' && (m.empirianIds || []).includes(coder)));
  await closeCards();
  await page.evaluate(() => window.__empires.ui.setSpeed(0));
  await page.click('.project-pill');
  await page.waitForTimeout(300);
  const chip = await page.textContent('#pp-code');
  check('the project card says how the code is, in words (patched after a shortcut)', /con parches|patched/.test(chip) && !/\d/.test(chip), chip);
  await page.screenshot({ path: path.join(out, 'project-code.png') });
  await closeCards();

  // Finish the game; the next plan warns about the inherited code.
  await page.evaluate(() => window.__empires.play(8 * 120));
  await closeCards();
  s = await st();
  check('the game shipped and part of the debt stays in the studio', !s.activeProjectId && s.company.techDebt > 0, String(s.company.techDebt));
  await page.keyboard.press('p');
  await page.waitForTimeout(400);
  const patched = s.company.techDebt >= 12;
  check('the next game plan warns about inherited code only when it is not solid', (await page.isVisible('#np-debt')) === patched, `inherited ${s.company.techDebt.toFixed(1)}`);
  await page.screenshot({ path: path.join(out, 'new-project-debt.png') });
  await closeCards();

  await page.click('#hud-menu'); await page.click('text=Guardar ahora');
  await page.goto(`${base}/?debug`);
  await page.waitForTimeout(1800);
  const back = await st();
  check('debt survives save/load', back.company.techDebt === s.company.techDebt && back.projects[0].debt === s.projects[0].debt);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  await browser.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})();
