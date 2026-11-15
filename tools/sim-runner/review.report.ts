/**
 * Gameplay review report (automated part). Run: EMPIRES_REPORT=1 npx vitest run tools/sim-runner/review.report.ts --silent=false
 */
import { it } from 'vitest';
import { autoplay, autoplayCareer, type AutoplayPlan } from '../../src/sim/autoplay';
import { TOPICS } from '../../src/content/topics';
import { SIM_CONFIG, msPerTickAt1x } from '../../src/sim/config';

const N = Number(process.env.EMPIRES_SEEDS ?? 30);
const seeds = Array.from({ length: N }, (_, i) => 9000 + i);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
type Plan = Omit<AutoplayPlan, 'seed'>;
const run = (plan: Plan) => seeds.map((seed) => autoplay({ ...plan, seed }));

it('gameplay review', () => {
  // 1. Dominant strategy: full grid
  const grid: { label: string; score: number; profit: number; perDay: number }[] = [];
  for (const days of [28, 42, 56, 84])
    for (const budget of [0, 1500, 4000])
      for (const bigIdea of ['approve', 'simple', 'keep'] as const)
        for (const pace of ['relaxed', 'normal', 'crunch'] as const)
          for (const testFocus of [0.2, 0.6, 0.9])
            for (const atDeadline of ['release', 'extend7'] as const) {
              const r = run({ days, budget, bigIdea, pace, testFocus, atDeadline });
              const profit = mean(r.map((x) => x.profit));
              grid.push({ label: `d${days} b${budget} ${bigIdea} ${pace} t${testFocus} ${atDeadline}`, score: mean(r.map((x) => x.score)), profit, perDay: profit / mean(r.map((x) => x.releaseDay)) });
            }
  const byProfit = [...grid].sort((a, b) => b.profit - a.profit);
  console.log(`\n== 1. STRATEGY GRID (${grid.length} plans x ${N} seeds) — top 8 / bottom 3 by profit`);
  for (const g of [...byProfit.slice(0, 8), ...byProfit.slice(-3)]) console.log(g.label.padEnd(44), `score ${g.score.toFixed(2)}  profit ${g.profit.toFixed(0)}  €/day ${g.perDay.toFixed(0)}`);
  const top = byProfit[0]!;
  const within5 = byProfit.filter((g) => g.profit >= top.profit * 0.95);
  const count = (key: string) => within5.filter((g) => g.label.includes(key)).length;
  console.log(`plans within 5% of best profit: ${within5.length}/${grid.length}`);
  console.log(`  of those: approve ${count(' approve ')}, simple ${count(' simple ')}, keep ${count(' keep ')} | relaxed ${count('relaxed')}, normal ${count('normal')}, crunch ${count('crunch')} | b0 ${count(' b0 ')}, b1500 ${count('b1500')}, b4000 ${count('b4000')} | d28 ${count('d28')}, d42 ${count('d42')}, d56 ${count('d56')}, d84 ${count('d84')}`);
  const byPerDay = [...grid].sort((a, b) => b.perDay - a.perDay);
  console.log('top 3 by profit per day:'); for (const g of byPerDay.slice(0, 3)) console.log('  ' + g.label.padEnd(44), `€/day ${g.perDay.toFixed(0)} score ${g.score.toFixed(2)}`);
  // marginal value of each lever (best of other levers held at default)
  const lever = (name: string, plans: [string, Plan][]) => console.log(`${name}: ` + plans.map(([l, p]) => { const r = run(p); return `${l}=${mean(r.map((x) => x.profit)).toFixed(0)}€/${mean(r.map((x) => x.score)).toFixed(2)}`; }).join('  '));
  console.log('\n== lever effects (profit/score, others default: 42d, 1500€, keep, normal, t0.6)');
  lever('bigIdea', (['approve', 'simple', 'postpone', 'keep'] as const).map((b) => [b, { bigIdea: b }]));
  lever('pace', (['relaxed', 'normal', 'crunch'] as const).map((b) => [b, { pace: b }]));
  lever('pace@28d', (['relaxed', 'normal', 'crunch'] as const).map((b) => [b, { pace: b, days: 28 }]));
  lever('test', [0.05, 0.2, 0.6, 0.9].map((b) => [String(b), { testFocus: b }]));
  lever('size', (['small', 'medium'] as const).map((b) => [b, { size: b, days: b === 'small' ? 56 : 112 }]));
  lever('medium days', [70, 98, 119].map((b) => [String(b), { size: 'medium', days: b, atDeadline: 'extend14' }]));

  // 2. Predictability
  console.log('\n== 2. PREDICTABILITY (same plan, different seeds)');
  for (const [l, p] of [['default', {}], ['28 days', { days: 28 }], ['crunch', { pace: 'crunch' }]] as [string, Plan][]) {
    const r = run(p);
    const sc = r.map((x) => x.score), pr = r.map((x) => x.profit);
    console.log(l.padEnd(10), `score ${mean(sc).toFixed(2)} ± ${sd(sc).toFixed(2)} (min ${Math.min(...sc)} max ${Math.max(...sc)})  profit ${mean(pr).toFixed(0)} ± ${sd(pr).toFixed(0)}`);
  }

  // 3. Interaction density
  console.log('\n== 3. INTERACTION DENSITY (default plan)');
  const r0 = autoplay({ seed: 9000, bigIdea: 'keep' });
  const p0 = r0.state.projects[0]!;
  const secPerDay = SIM_CONFIG.realSecondsPerDayAt1x;
  const ideaDay = r0.state.ledger.find((e) => e.kind === 'decision')!.day;
  const prodDone = r0.state.ledger.find((e) => e.kind === 'production_done')!.day;
  console.log(`tick ${msPerTickAt1x()}ms; day=${secPerDay}s at 1x. start→big idea: ${ideaDay - 1} days (${(ideaDay - 1) * secPerDay}s @1x, ${((ideaDay - 1) * secPerDay / 4).toFixed(0)}s @4x); big idea→production done: ${prodDone - ideaDay} days; production done→deadline: ${p0.deadlineDay - prodDone} days (${(p0.deadlineDay - prodDone) * secPerDay}s @1x) with NO mandatory interaction`);
  console.log(`mandatory decisions per project: ${p0.decisionsTaken.length}; whole project ${p0.deadlineDay - 1} days = ${(p0.deadlineDay - 1) * secPerDay}s @1x`);

  // 4. Project similarity across topics (ideal focus each)
  console.log('\n== 4. PROJECT SIMILARITY (each topic at its ideal focus / at 0.5)');
  for (const t of TOPICS) {
    const a = run({ topicId: t.id, focus: t.idealFocus }), b = run({ topicId: t.id, focus: 0.5 });
    console.log(t.id.padEnd(12), `ideal: score ${mean(a.map((x) => x.score)).toFixed(2)} profit ${mean(a.map((x) => x.profit)).toFixed(0)} | focus 0.5: score ${mean(b.map((x) => x.score)).toFixed(2)} profit ${mean(b.map((x) => x.profit)).toFixed(0)}`);
  }

  // 5. Progression over a career
  console.log('\n== 5. PROGRESSION (8 consecutive projects, default plan, 10 seeds)');
  const careers = seeds.slice(0, 10).map((s) => autoplayCareer(s, 8, () => ({ bigIdea: 'approve' })));
  for (let i = 0; i < 8; i++) console.log(`project ${i + 1}: score ${mean(careers.map((c) => c.scores[i]!)).toFixed(2)}  money after ${mean(careers.map((c) => c.moneyAfter[i]!)).toFixed(0)}`);
  const f = careers[0]!.game.state;
  console.log(`after 8 projects: reputation ${f.company.reputation.toFixed(0)}, founder skills ${JSON.stringify(f.empirians[0]!.skills)}, day ${f.day}`);
});
