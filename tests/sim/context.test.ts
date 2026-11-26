import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { contractsDay } from '../../src/sim/systems/contracts';
import { unlockAll } from '../../src/sim/systems/progress';
import { STORY_EVENTS } from '../../src/sim/systems/storyEvents';
import { SIM_CONFIG } from '../../src/sim/config';
import type { SimEvent } from '../../src/sim/core/events';

/** 0.20.0: contextual happenings — news without windows, personality in decisions. */
function studio(seed = 5) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state);
  return g;
}

describe('word of mouth (client referral)', () => {
  it('a loyal, happy client recommends the studio once: a better-paid offer from someone new, as news', () => {
    const g = studio();
    const s = g.state;
    s.contracts.clients = { bakery: { jobs: 4, trust: 3 } };
    s.contracts.offers = [];
    const events: SimEvent[] = [];
    let got = false;
    for (let d = 0; d < 60 && !got; d++) {
      s.day += 1;
      s.contracts.nextRefreshDay = Math.min(s.contracts.nextRefreshDay, s.day);
      s.contracts.offers = [];
      contractsDay(s, (e) => events.push(e));
      got = s.contracts.offers.some((o) => o.referredBy === 'bakery');
    }
    expect(got).toBe(true);
    const offer = s.contracts.offers.find((o) => o.referredBy === 'bakery')!;
    expect(offer.clientId).not.toBe('bakery');
    expect(s.contracts.clients!.bakery!.referred).toBe(true);
    expect(events.some((e) => e.type === 'client_referral')).toBe(true);
    expect(s.pendingDecision).toBeNull(); // news, not a window
    // Never twice from the same client.
    for (let d = 0; d < 60; d++) { s.day += 1; s.contracts.nextRefreshDay = s.day; s.contracts.offers = []; contractsDay(s); }
    expect(s.contracts.offers.filter((o) => o.referredBy === 'bakery').length).toBe(0);
  });

  it('happens in a normal game (full list of offers) and is deterministic', () => {
    const run = () => {
      const g = studio(8);
      const s = g.state;
      s.contracts.clients = { gym: { jobs: 5, trust: 4 } };
      for (let d = 0; d < 40; d++) { s.day += 1; s.contracts.nextRefreshDay = Math.min(s.contracts.nextRefreshDay, s.day); contractsDay(s); }
      return { state: JSON.stringify(s.contracts), referred: !!s.contracts.clients!.gym!.referred, max: s.contracts.offers.length };
    };
    const a = run(), b = run();
    expect(a.referred).toBe(true);
    expect(a.max).toBeLessThanOrEqual(SIM_CONFIG.contracts.maxOffers);
    expect(a.state).toBe(b.state);
  });

  it('a recommended client pays better than usual', () => {
    expect(SIM_CONFIG.contracts.referralPay).toBeGreaterThan(1);
  });
});

describe('personality in decisions', () => {
  it('in a debate, the perfectionist is the one who wants to redo it properly', () => {
    const debate = STORY_EVENTS.find((e) => e.kind === 'team_debate')!;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = studio(seed);
      const s = g.state;
      s.empirians.push({ ...s.empirians[0]!, id: 'E-p', name: 'Pía', trait: 'perfectionist', hiredDay: 0 });
      s.empirians.push({ ...s.empirians[0]!, id: 'E-n', name: 'Noa', trait: 'night_owl', hiredDay: 0 });
      g.dispatch({ type: 'start_project', name: 'X', topicId: 'kart', size: 'small', focus: 0.6, budget: 0, days: 35, price: 9.99 });
      const p = s.projects.find((q) => q.id === s.activeProjectId)!;
      p.phase = 'production';
      const c = debate.trigger(s);
      if (!c) continue;
      const ids = [c.aId, c.bId];
      if (ids.includes('E-p')) expect(c.aId).toBe('E-p');
      else if (ids.includes('E-n')) expect(c.bId).toBe('E-n');
    }
  });
});
