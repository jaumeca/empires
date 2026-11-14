import { it } from 'vitest';
import { autoplayCareer } from '../../src/sim/autoplay';
import { serialize } from '../../src/sim/save/save';

it('history growth over a long career', () => {
  const { game } = autoplayCareer(1, 60, (i) => ({ bigIdea: i % 2 ? 'approve' : 'keep', pace: i % 3 ? 'normal' : 'crunch', atDeadline: 'extend7' }));
  const s = game.state;
  const size = serialize(s, { gameVersion: 'x', savedAt: 'x' }).length;
  console.log(`projects=${s.projects.length} days=${s.day} years=${(s.day / 365).toFixed(1)} ledger=${s.ledger.length} commands=${game.commandLog.length} save=${(size / 1024).toFixed(1)}KB perProject=${(size / 1024 / s.projects.length).toFixed(2)}KB`);
});
