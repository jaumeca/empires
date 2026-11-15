import { it } from 'vitest';
import { autoplay, type AutoplayPlan } from '../../src/sim/autoplay';
const seeds = Array.from({ length: 40 }, (_, i) => 9000 + i);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const res = (p: Omit<AutoplayPlan, 'seed'>) => { const r = seeds.map((seed) => autoplay({ ...p, seed })); return `${mean(r.map((x) => x.profit)).toFixed(0)}€/${mean(r.map((x) => x.score)).toFixed(2)}/b${mean(r.map((x) => x.shippedBugs)).toFixed(1)}`; };
it('pace levers with contextual moments', () => {
  for (const days of [28, 42, 84]) {
    console.log(`@${days}d normal ${res({ days })} | crunch+rest ${res({ days, pace: 'crunch' })} | crunch+push ${res({ days, pace: 'crunch', moments: { exhausted: 'push' } })} | crunch+relaxed ${res({ days, pace: 'crunch', moments: { exhausted: 'relaxed' } })} | crunchLast7 ${res({ days, crunchLastDays: 7 })} | relaxed ${res({ days, pace: 'relaxed' })}`);
    console.log(`   late: carry_on ${res({ days })} cut ${res({ days, moments: { running_late: 'cut' } })} sprint ${res({ days, moments: { running_late: 'sprint' } })} delay ${res({ days, moments: { running_late: 'delay' } })} | polish: test ${res({ days, moments: { polish_plan: 'test' } })} bal ${res({ days })} improve ${res({ days, moments: { polish_plan: 'improve' } })}`);
  }
  console.log(`medium 119d: normal ${res({ size: 'medium', days: 119 })} rest-policy ${res({ size: 'medium', days: 119, restBelowEnergy: 45 })} crunch ${res({ size: 'medium', days: 119, pace: 'crunch' })} | 84d: normal ${res({ size: 'medium', days: 84 })} cut ${res({ size: 'medium', days: 84, moments: { running_late: 'cut' } })} sprint ${res({ size: 'medium', days: 84, moments: { running_late: 'sprint' } })} delay ${res({ size: 'medium', days: 84, moments: { running_late: 'delay' } })}`);
});
