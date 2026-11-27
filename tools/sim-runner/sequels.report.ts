import { it } from 'vitest';
import { career, mean, STRATEGIES } from './careers';

/** 0.23.0 (D-073): sequels against the other ways of playing (2 years, 12 seeds). Run with `npm run sim -- sequels`. */
const seeds = Array.from({ length: 12 }, (_, i) => 900 + i);
it('sequels vs other strategies', () => {
  for (const prefix of (process.env.SEQ_ONLY ?? 'A,S,N,M,D,G').split(',')) {
    const st = STRATEGIES.find((s) => s.name.startsWith(prefix))!;
    for (const horizon of [365, 730]) {
      const rs = seeds.map((sd) => career(sd, st, horizon));
      const money = rs.map((r) => r.money);
      const wins = horizon === 730 ? '' : '';
      console.log(`${st.name.padEnd(42)} ${horizon}d money ${mean(money).toFixed(0).padStart(7)} min ${Math.min(...money).toFixed(0).padStart(7)} score ${mean(rs.map((r) => r.score)).toFixed(2)} games ${mean(rs.map((r) => r.games)).toFixed(1)}${wins}`);
    }
  }
}, 600000);
