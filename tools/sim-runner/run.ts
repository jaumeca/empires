/**
 * Headless balance runner: plays many projects with different plans and prints
 * averages. Usage: npm run sim [-- seeds]
 */
import { autoplay, type AutoplayPlan } from '../../src/sim/autoplay';

const N = Number(process.argv[2] ?? 40);
const seeds = Array.from({ length: N }, (_, i) => 5000 + i);

function row(label: string, plan: Omit<AutoplayPlan, 'seed'>) {
  const runs = seeds.map((seed) => autoplay({ ...plan, seed }));
  const m = (f: (r: (typeof runs)[number]) => number) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  console.log(
    label.padEnd(34),
    `score ${m((r) => r.score).toFixed(2)}`.padEnd(12),
    `bugs ${m((r) => r.shippedBugs).toFixed(1)}`.padEnd(11),
    `units ${m((r) => r.units).toFixed(0)}`.padEnd(13),
    `profit ${m((r) => r.profit).toFixed(0)}`.padEnd(14),
    `day ${m((r) => r.releaseDay).toFixed(0)}`,
  );
}

console.log(`--- duration (budget 1200), ${N} seeds`);
for (const days of [14, 28, 42, 56, 84, 112]) row(`days ${days}`, { days, budget: 1200 });
console.log('--- budget (42 days)');
for (const budget of [0, 500, 1000, 2000, 4000, 7500]) row(`budget ${budget}`, { days: 42, budget });
console.log('--- pace / testing (42 days)');
for (const pace of ['relaxed', 'normal', 'crunch'] as const) row(`pace ${pace}`, { days: 42, pace });
for (const testFocus of [0.05, 0.3, 0.6, 0.9]) row(`testFocus ${testFocus}`, { days: 42, testFocus });
console.log('--- big idea (42 days, extend7 at deadline)');
for (const bigIdea of ['approve', 'simple', 'postpone', 'keep'] as const) row(`bigIdea ${bigIdea}`, { days: 42, bigIdea, atDeadline: 'extend7' });
console.log('--- focus fit (space-farm ideal 0.35)');
for (const focus of [0, 0.35, 0.7, 1]) row(`focus ${focus}`, { days: 42, focus });
console.log('--- price');
for (const price of [4.99, 9.99, 14.99, 19.99]) row(`price ${price}`, { days: 42, price });
