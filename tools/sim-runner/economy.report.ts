/**
 * LS.9 economy & progression review: whole-year careers with different strategies
 * (games only, growth, contracts only, mixed, office investment, trends).
 * Run: EMPIRES_REPORT=1 npx vitest run tools/sim-runner/economy.report.ts --silent=false
 */
import { it } from 'vitest';
import { career, mean, pct, STRATEGIES } from './careers';

const N = Number(process.env.EMPIRES_SEEDS ?? 20);
const HORIZON = Number(process.env.EMPIRES_DAYS ?? 365);
const seeds = Array.from({ length: N }, (_, i) => 4200 + i);
it('economy review', () => {
  console.log(`\n== LS.9 ECONOMY REVIEW — ${N} seeds × ${HORIZON} days`);
  console.log('strategy'.padEnd(42), 'money(mean)  p10      min(mean)  games  score  contracts(late)  office€  rep  skill t/d/c/m (seed 0)');
  for (const st of STRATEGIES) {
    const rs = seeds.map((sd) => career(sd, st, HORIZON));
    const all = new Set<string>(); rs.forEach((r) => r.decisions.forEach((d) => all.add(d)));
    console.log(
      st.name.padEnd(42),
      mean(rs.map((r) => r.money)).toFixed(0).padStart(9),
      pct(rs.map((r) => r.money), 0.1).toFixed(0).padStart(9),
      mean(rs.map((r) => r.minMoney)).toFixed(0).padStart(9),
      mean(rs.map((r) => r.games)).toFixed(1).padStart(6),
      mean(rs.filter((r) => r.games).map((r) => r.score)).toFixed(2).padStart(6),
      `${mean(rs.map((r) => r.contracts)).toFixed(1)}(${rs.reduce((a, r) => a + r.late, 0)})`.padStart(12),
      mean(rs.map((r) => r.spentOffice)).toFixed(0).padStart(9),
      mean(rs.map((r) => r.rep)).toFixed(0).padStart(5),
      rs[0]!.skill.padStart(16),
      ` team ${mean(rs.map((r) => r.team)).toFixed(1)} salaries ${mean(rs.map((r) => r.salaries)).toFixed(0)}`,
      ` kinds:${all.size}`,
    );
  }
});
