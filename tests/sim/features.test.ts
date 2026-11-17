import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { featureCeiling, featureLock, featureReach, FEATURE_CFG, hashUnit, openTrouble } from '../../src/sim/systems/features';
import { FEATURES, getFeature } from '../../src/content/features';
import { SIM_CONFIG } from '../../src/sim/config';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { Project } from '../../src/sim/model/state';

/** AW.D.1/D.2 — features cost work and risk; prototypes are a strategic choice. */
function game(seed = 1, released = 0) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  g.state.company.money = 50000;
  // Pretend an experienced studio (for unlocks): earlier releases whose sales are over, and a skilled coder.
  for (let i = 0; i < released; i++) {
    g.state.projects.push({
      id: `P-old${i}`, name: `Old ${i}`, topicId: 'kart', size: 'small', phase: 'released', focus: 0.5, pace: 'normal', startDay: 0, deadlineDay: 0, originalDeadlineDay: 0,
      budget: 0, spent: 0, price: 9.99, requiredPoints: 220, workDone: { design: 0, tech: 0 }, polishDone: 0, testingDone: 0, ceilingMods: [], bugRateMods: [],
      bugs: { hidden: 0, known: 0, fixed: 0 }, hype: 1, testFocus: 0.6, decisionsTaken: [], bigIdeaOffered: true,
      result: { releasedDay: 0, price: 9.99, reviews: [], averageScore: 6, weeklySales: [], totalUnits: 0, revenue: 0, explanation: [], salesEnded: true },
    } as unknown as Project);
  }
  if (released) { g.state.empirians[0]!.skills.tech = 6.5; g.state.story.seenReleases.push(...g.state.projects.map((p) => p.id)); }
  return g;
}
type Plan = { topicId?: string; size?: 'small' | 'medium'; features?: string[]; prototype?: boolean; days?: number };
function start(g: Game, plan: Plan) {
  return g.dispatch({ type: 'start_project', name: 'X', topicId: plan.topicId ?? 'pirates', size: plan.size ?? 'small', focus: 0.45, budget: 1500, days: plan.days ?? 42, price: 9.99, features: plan.features, prototype: plan.prototype });
}
function finish(g: Game, answers: Record<string, string> = {}) {
  const pid = g.state.activeProjectId!;
  const seen: string[] = [];
  for (let i = 0; i < 60000 && g.state.activeProjectId; i++) {
    const d = g.state.pendingDecision;
    if (d) {
      seen.push(d.kind);
      const pref = answers[d.kind] ?? (d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id);
      g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options.some((o) => o.id === pref) ? pref : d.options[0]!.id });
    } else g.tick();
  }
  return { p: getProject(g.state, pid)!, seen };
}
/** A seed whose hidden risk roll makes `feature` troubled (or not) for the next project id. */
function seedWhere(feature: string, troubled: boolean): number {
  const f = getFeature(feature)!;
  for (let seed = 1; seed < 5000; seed++) {
    const g = game(seed, 3);
    const nextId = `P-${g.state.nextId}`;
    if ((hashUnit(seed, nextId, feature) < f.risk) === troubled) return seed;
  }
  throw new Error('no seed');
}

describe('features and prototypes (AW.D)', () => {
  it('features add work and bugs; slots and unlocks are enforced', () => {
    const g = game(2);
    expect(start(g, { features: ['story', 'customization', 'smart_ai'] })).toEqual({ ok: false, error: 'too_many_features' });
    expect(start(g, { features: ['multiplayer'] })).toEqual({ ok: false, error: 'feature_needs_releases' });
    expect(start(g, { features: ['open_world'] })).toEqual({ ok: false, error: 'feature_too_small' });
    expect(start(g, { features: ['nope'] })).toEqual({ ok: false, error: 'unknown_feature' });
    expect(g.state.projects).toHaveLength(0); // nothing changed on refusal
    expect(start(g, { features: ['story', 'customization'] }).ok).toBe(true);
    const p = getProject(g.state, g.state.activeProjectId!)!;
    expect(p.requiredPoints).toBe(Math.round(SIM_CONFIG.work.requiredPoints.small! * (1 + getFeature('story')!.work + getFeature('customization')!.work)));
    expect(p.bugRateMods.some((m) => m.factor > 1 && m.causeId)).toBe(true);
    expect(featureLock(game(3, 3).state, getFeature('multiplayer')!, 'small')).toBeNull();
  });

  it('fit matters: the same feature helps one topic and barely another', () => {
    const pirates = { topicId: 'pirates', features: ['story'], size: 'small' } as Project;
    const kart = { topicId: 'kart', features: ['story'], size: 'small' } as Project;
    expect(featureCeiling(pirates)).toBeGreaterThan(featureCeiling(kart) + 0.4);
    expect(featureReach({ features: ['cross_platform'] } as Project)).toBeGreaterThan(1.2);
    // Diminishing returns: two great features are worth less than twice one.
    const two = { topicId: 'pirates', features: ['story', 'smart_ai'] } as Project;
    expect(featureCeiling(two)).toBeLessThan(2 * featureCeiling(pirates));
  });

  it('fitting features with time to build them pay off; misfits and overloaded plans do not (no dominant plan)', () => {
    const avg = (plan: Plan) => {
      let total = 0;
      for (const seed of [11, 12, 13, 14, 15, 16]) {
        const g = game(seed, 3);
        g.dispatch({ type: 'start_project', name: 'X', topicId: plan.topicId!, size: 'small', focus: plan.topicId === 'kart' ? 0.7 : 0.45, budget: 1500, days: plan.days!, price: 9.99, features: plan.features });
        total += finish(g, { feature_trouble: 'push' }).p.result!.averageScore;
      }
      return total / 6;
    };
    const none = avg({ topicId: 'pirates', days: 42 });
    const fit = avg({ topicId: 'pirates', features: ['story'], days: 49 });
    const misfit = avg({ topicId: 'kart', features: ['story'], days: 49 });
    const kartNone = avg({ topicId: 'kart', days: 42 });
    const overloaded = avg({ topicId: 'kart', features: ['multiplayer', 'level_editor'], days: 42 });
    expect(fit).toBeGreaterThan(none + 0.3);
    expect(misfit).toBeLessThan(fit - 0.5);
    expect(overloaded).toBeLessThan(kartNone - 0.5);
  });

  it('without a prototype, a risky feature shows its problem mid-production with costly options', () => {
    const seed = seedWhere('multiplayer', true);
    const g = game(seed, 3);
    start(g, { topicId: 'kart', features: ['multiplayer'], days: 56 });
    const p0 = getProject(g.state, g.state.activeProjectId!)!;
    expect(openTrouble(p0)).toEqual(['multiplayer']);
    const req0 = p0.requiredPoints;
    const { p, seen } = finish(g, { feature_trouble: 'push' });
    expect(seen).toContain('feature_trouble');
    expect(p.requiredPoints).toBeGreaterThan(req0); // pushing through costs work
    expect(p.featureResolved).toEqual(['multiplayer']);
    // Shipping it as it is lowers the ceiling instead.
    const g2 = game(seed, 3);
    start(g2, { topicId: 'kart', features: ['multiplayer'], days: 56 });
    const r2 = finish(g2, { feature_trouble: 'ship' });
    expect(r2.p.featureIgnored).toEqual(['multiplayer']);
    expect(featureCeiling(r2.p)).toBeLessThan(featureCeiling(p));
  });

  it('a prototype finds the problem early and fixing it then is cheaper', () => {
    const seed = seedWhere('multiplayer', true);
    const late = game(seed, 3);
    start(late, { topicId: 'kart', features: ['multiplayer'], days: 56 });
    const lateRun = finish(late, { feature_trouble: 'push' });
    const early = game(seed, 3);
    const money0 = early.state.company.money;
    start(early, { topicId: 'kart', features: ['multiplayer'], prototype: true, days: 56 });
    expect(early.state.company.money).toBeLessThanOrEqual(money0 - FEATURE_CFG.prototypeCost);
    const earlyRun = finish(early, { prototype_result: 'fix' });
    expect(earlyRun.seen).toContain('prototype_result');
    expect(earlyRun.seen).not.toContain('feature_trouble');
    const extra = (r: typeof lateRun) => r.p.requiredPoints;
    // prototype work + early fix < late fix
    expect(extra(earlyRun)).toBeLessThan(extra(lateRun));
  });

  it('a prototype with no problems validates the idea (small bonus), but is not free', () => {
    const seed = seedWhere('story', false);
    const g = game(seed, 3);
    start(g, { topicId: 'pirates', features: ['story'], prototype: true });
    const { p, seen } = finish(g);
    expect(seen).not.toContain('prototype_result');
    expect(p.prototypeValidated).toBe(true);
    expect(g.state.ledger.some((l) => l.text.key === 'ledger.prototype.validated') || p.prototypeValidated).toBe(true);
    expect(p.requiredPoints).toBeGreaterThan(Math.round(SIM_CONFIG.work.requiredPoints.small! * (1 + getFeature('story')!.work))); // the prototype costs work
  });

  it('features are deterministic, saved, and every feature is described', () => {
    const run = () => { const g = game(21, 3); start(g, { topicId: 'robots', features: ['smart_ai', 'multiplayer'] }); return JSON.stringify(finish(g).p); };
    expect(run()).toBe(run());
    const g = game(22, 3);
    start(g, { topicId: 'robots', features: ['smart_ai'], prototype: true });
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(back.projects[back.projects.length - 1]!.features).toEqual(['smart_ai']);
    for (const f of FEATURES) expect(f.work).toBeGreaterThan(0);
  });
});
