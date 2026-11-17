import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { canPlace } from '../../src/sim/systems/office';
import { SIM_CONFIG } from '../../src/sim/config';
import type { SimEvent } from '../../src/sim/core/events';
import type { Rot, TraitId } from '../../src/sim/model/state';

/** AW.B — short, purposeful breaks: deterministic, moderate, at most one a day. */
const R = SIM_CONFIG.routines;
function place(g: Game, defId: string) {
  for (let z = 0; z < 8; z++) for (let x = 0; x < 10; x++) for (const rot of [0, 1, 2, 3] as Rot[])
    if (!canPlace(g.state.office, defId, x, z, rot)) return g.dispatch({ type: 'buy_item', defId, x, z, rot }).ok;
  return false;
}
function studio(opts: { seed?: number; items?: string[]; partner?: TraitId; pace?: 'normal' | 'crunch' | 'relaxed'; contract?: boolean } = {}) {
  const g = new Game(createNewGame(opts.seed ?? 3));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  g.state.company.money = 60000;
  for (const id of opts.items ?? []) expect(place(g, id)).toBe(true);
  if (opts.partner) {
    place(g, 'desk_basic');
    g.state.contracts.completed = 1;
    g.state.hiring.candidates.push({ id: 'H-t', name: 'Iris', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 5 }, trait: opts.partner, salary: 400, expiresDay: 99 });
    expect(g.dispatch({ type: 'hire', candidateId: 'H-t' }).ok).toBe(true);
  }
  const events: SimEvent[] = [];
  g.onUpdate((ev) => events.push(...ev));
  g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'medium', focus: 0.7, budget: 3000, days: 98, price: 14.99 });
  if (opts.pace) g.dispatch({ type: 'adjust_project', pace: opts.pace });
  return { g, events };
}
function runDays(g: Game, days: number) {
  const end = g.state.day + days;
  for (let i = 0; i < 100000 && g.state.day < end; i++) {
    const d = g.state.pendingDecision;
    if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1]!.id });
    else g.tick();
  }
}
const routines = (ev: SimEvent[]) => ev.filter((e): e is Extract<SimEvent, { type: 'routine' }> => e.type === 'routine');

describe('daily routines (AW.B)', () => {
  it('a drink break happens at the drink hour when tired and there is a drink source; costs that hour of work', () => {
    const { g, events } = studio({ items: ['water_cooler'] });
    const f = g.state.empirians[0]!;
    runDays(g, 1);
    // Make the founder tired and reach the drink hour.
    f.energy = 40;
    while (g.state.tick % SIM_CONFIG.ticksPerDay !== R.drinkHour) g.tick();
    const p = g.state.projects[0]!;
    const workBefore = p.workDone.tech + p.workDone.design;
    const energyBefore = f.energy;
    g.tick();
    const drink = routines(events).filter((r) => r.kind === 'drink');
    expect(drink.length).toBeGreaterThanOrEqual(1);
    expect(p.workDone.tech + p.workDone.design).toBe(workBefore); // no work during the break
    expect(f.activity).toBe('drinking');
    expect(f.energy).toBeGreaterThan(energyBefore); // the drink restores a little energy
  });

  it('no drink source, no drink break; never more than one break per person per day', () => {
    const { g, events } = studio({ seed: 4 });
    runDays(g, 30);
    expect(routines(events).filter((r) => r.kind === 'drink')).toHaveLength(0);
    // A busy studio with every kind of break: still one per person per day.
    const perDay = new Map<string, number>();
    const { g: g2 } = studio({ seed: 5, items: ['water_cooler', 'sofa'], partner: 'sociable' });
    g2.onUpdate((ev) => { for (const e of ev) if (e.type === 'routine') { const k = `${g2.state.day}:${e.empirianId}`; perDay.set(k, (perDay.get(k) ?? 0) + 1); } });
    runDays(g2, 30);
    expect(perDay.size).toBeGreaterThan(5);
    for (const n of perDay.values()) expect(n).toBe(1);
  });

  it('exhausted Empirians rest on a sofa or armchair, but not during crunch', () => {
    const a = studio({ seed: 6 });
    a.g.state.empirians[0]!.energy = 20;
    runDays(a.g, 1);
    expect(routines(a.events).some((r) => r.kind === 'rest')).toBe(true); // the starting armchair
    const b = studio({ seed: 6, pace: 'crunch' });
    b.g.state.empirians[0]!.energy = 20;
    runDays(b.g, 1);
    expect(routines(b.events).some((r) => r.kind === 'rest')).toBe(false);
  });

  it('a sociable colleague starts chats that lift both moods; nobody chats in crunch', () => {
    const { g, events } = studio({ seed: 7, partner: 'sociable' });
    const m0 = g.state.empirians.map((e) => e.morale);
    let chatted = false;
    g.onUpdate((ev) => { if (ev.some((e) => e.type === 'routine' && e.kind === 'chat')) chatted = true; });
    for (let i = 0; i < 8 * 3 && !chatted; i++) g.tick();
    expect(chatted).toBe(true);
    const pair = routines(events).filter((r) => r.kind === 'chat');
    expect(new Set(pair.map((r) => r.empirianId)).size).toBe(2);
    expect(pair[0]!.partnerId).toBe(pair[1]!.empirianId);
    expect(g.state.empirians.every((e, i) => e.morale >= m0[i]! - 1)).toBe(true);
    const c = studio({ seed: 7, partner: 'sociable', pace: 'crunch' });
    runDays(c.g, 5);
    expect(routines(c.events).some((r) => r.kind === 'chat')).toBe(false);
  });

  it('in crunch only the night owl still takes a coffee', () => {
    const owl = studio({ seed: 8, items: ['coffee_machine'], partner: 'night_owl', pace: 'crunch' });
    for (const e of owl.g.state.empirians) e.energy = 45;
    runDays(owl.g, 1);
    const drinkers = new Set(routines(owl.events).filter((r) => r.kind === 'drink').map((r) => r.empirianId));
    const owlId = owl.g.state.empirians.find((e) => e.trait === 'night_owl')!.id;
    expect([...drinkers]).toEqual([owlId]);
  });

  it('routines are deterministic and only happen while working', () => {
    const run = () => { const s = studio({ seed: 9, items: ['water_cooler'], partner: 'curious' }); runDays(s.g, 20); return { ev: JSON.stringify(routines(s.events)), st: JSON.stringify(s.g.state) }; };
    const a = run(), b = run();
    expect(a.ev).toBe(b.ev);
    expect(a.st).toBe(b.st);
    // Idle studio: no project, no contract → no breaks.
    const g = new Game(createNewGame(10));
    g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
    const ev: SimEvent[] = [];
    g.onUpdate((x) => ev.push(...x));
    g.state.empirians[0]!.energy = 20;
    for (let i = 0; i < 8 * 10; i++) g.tick();
    expect(routines(ev)).toHaveLength(0);
  });
});

