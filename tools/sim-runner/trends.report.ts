import { it } from 'vitest';
import { autoplayCareer } from '../../src/sim/autoplay';
import { TOPICS, getTopic } from '../../src/content/topics';
import { topicMood } from '../../src/sim/systems/world';
import type { GameState } from '../../src/sim/model/state';
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const seeds = Array.from({ length: 16 }, (_, i) => 700 + i);
const ideal = (id: string) => ({ topicId: id, focus: getTopic(id).idealFocus });
const policies: Record<string, (i: number, s: GameState) => object> = {
  'A chase any trend': (_i, s) => { const t = s.world.trends.filter((x) => s.day >= x.startDay && s.day < x.endDay).sort((a, b) => b.strength - a.strength)[0]; return ideal(t ? t.topicId : 'kart'); },
  'B stay on kart   ': () => ideal('kart'),
  'C early trends   ': (_i, s) => { const t = s.world.trends.find((x) => s.day - x.startDay <= 14 && s.day < x.peakDay); return ideal(t ? t.topicId : 'kart'); },
  'D avoid crowded  ': (_i, s) => { const ok = TOPICS.filter((t) => topicMood(s, t.id) !== 'crowded').sort((a, b) => b.interest - a.interest); return ideal(ok[0]?.id ?? 'kart'); },
};
it('trend strategies', () => {
  for (const [name, pol] of Object.entries(policies)) {
    const cs = seeds.map((sd) => autoplayCareer(sd, 8, pol as never));
    const st = cs[0]!.game.state;
    console.log(name, 'money after 8 games', mean(cs.map((c) => c.moneyAfter[7]!)).toFixed(0), 'avg score', mean(cs.flatMap((c) => c.scores)).toFixed(2), '| news in seed0:', st.world.news.length, 'trends', st.world.trends.length);
  }
  const s = autoplayCareer(700, 8).game.state;
  const kinds: Record<string, number> = {};
  for (const n of s.world.news) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
  console.log('news kinds (last 40) seed 700:', JSON.stringify(kinds), 'day', s.day);
});
