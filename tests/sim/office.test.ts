import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { canPlace, footprintCells, founderDesk, officeEffects, reserveCells, useSpot } from '../../src/sim/systems/office';
import { getItemDef, ITEMS, STARTING_ITEMS } from '../../src/content/officeItems';
import { autoplay, type AutoplayPlan } from '../../src/sim/autoplay';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { Command } from '../../src/sim/commands';

function newGame(money = 20000) {
  const g = new Game(createNewGame(1));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.state.company.money = money;
  return g;
}
const SEEDS = Array.from({ length: 24 }, (_, i) => 3000 + i);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function avg(plan: Omit<AutoplayPlan, 'seed'>) {
  const runs = SEEDS.map((seed) => autoplay({ ...plan, seed }));
  return { profit: mean(runs.map((r) => r.profit)), score: mean(runs.map((r) => r.score)), day: mean(runs.map((r) => r.releaseDay)) };
}
const deskUid = (g: Game) => founderDesk(g.state.office)!.uid;

describe('office catalog data (LS.2)', () => {
  it('every item has a unique id, a price, a size and a model', () => {
    const ids = new Set<string>();
    for (const d of ITEMS) {
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
      expect(d.price).toBeGreaterThan(0);
      expect(d.model.length).toBeGreaterThan(0);
      if (d.layer !== 'mount') expect(d.size.w * d.size.d).toBeGreaterThan(0);
    }
    expect(ITEMS.length).toBeGreaterThanOrEqual(10);
    // A curated catalog (ML.4: "a small, beautiful, complete set before dozens of items").
    expect(ITEMS.length).toBeLessThanOrEqual(48); // 0.22.0: functional furniture (D-072)
  });
  it('the starting office is a valid layout (same furniture as the v0.1 bedroom)', () => {
    const s = createNewGame(1);
    expect(s.office.items.map((i) => i.defId).sort()).toEqual(STARTING_ITEMS.map((i) => i.defId).sort());
    for (const it of s.office.items) {
      const others = { ...s.office };
      expect(canPlace(others, it.defId, it.x, it.z, it.rot, it.uid), it.defId).toBeNull();
    }
    expect(founderDesk(s.office)?.mounts).toEqual({ computer: 'pc_basic', chair: 'chair_basic' });
  });
  it('rotation keeps footprint size and moves the access area to the item front', () => {
    const def = getItemDef('sofa');
    for (const rot of [0, 1, 2, 3] as const) {
      const cells = footprintCells(def, 3, 3, rot);
      expect(cells.length).toBe(8);
      const res = reserveCells(def, 3, 3, rot);
      expect(res.length).toBe(4);
      for (const c of res) expect(cells.some((f) => f[0] === c[0] && f[1] === c[1])).toBe(false);
    }
    // rot 1 → front faces +x: reserve column is to the right of the footprint
    const maxX = Math.max(...footprintCells(def, 3, 3, 1).map((c) => c[0]));
    expect(reserveCells(def, 3, 3, 1).every((c) => c[0] === maxX + 1)).toBe(true);
  });
});

describe('placement rules (LS.3)', () => {
  it('rejects out of bounds, overlaps and blocked access', () => {
    const g = newGame();
    expect(canPlace(g.state.office, 'sofa', 8, 6, 0)).toBe('out_of_bounds');
    expect(canPlace(g.state.office, 'plant_small', 2, 0, 0)).toBe('overlap'); // on the desk
    expect(canPlace(g.state.office, 'plant_small', 3, 2, 0)).toBe('blocks_access'); // where the chair goes
    expect(canPlace(g.state.office, 'rug_checker', 2, 0, 0)).toBeNull(); // rugs go under furniture
  });
  it('rejects layouts that wall off part of the room', () => {
    const g = newGame(50000);
    // A row of plants across the room cuts it in two.
    let rejected = false;
    for (let x = 0; x < 10 && !rejected; x += 2) {
      const r = g.dispatch({ type: 'buy_item', defId: 'plant_small', x, z: 6, rot: 0 });
      if (!r.ok) { expect(r.error).toMatch(/place_(unreachable|blocks_access|overlap)/); rejected = true; }
    }
    expect(rejected).toBe(true);
  });
  it('buy, move, rotate and sell change money and layout as expected', () => {
    const g = newGame(5000);
    const n = g.state.office.items.length;
    expect(g.dispatch({ type: 'buy_item', defId: 'whiteboard', x: 6, z: 0, rot: 0 }).ok).toBe(false); // bumps into the plant
    expect(g.dispatch({ type: 'buy_item', defId: 'whiteboard', x: 6, z: 2, rot: 0 })).toEqual({ ok: false, error: 'place_unreachable' }); // would close off a corner
    expect(g.dispatch({ type: 'buy_item', defId: 'whiteboard', x: 6, z: 3, rot: 0 }).ok).toBe(true);
    expect(g.state.office.items.length).toBe(n + 1);
    expect(g.state.company.money).toBe(5000 - 400);
    const wb = g.state.office.items.at(-1)!;
    expect(g.dispatch({ type: 'move_item', uid: wb.uid, x: 5, z: 6, rot: 0 }).ok).toBe(true);
    expect(g.dispatch({ type: 'move_item', uid: wb.uid, x: 5, z: 6, rot: 2 }).ok).toBe(true); // rotated in place
    expect(g.state.office.items.at(-1)!.rot).toBe(2);
    expect(g.dispatch({ type: 'sell_item', uid: wb.uid }).ok).toBe(true);
    expect(g.state.company.money).toBe(5000 - 400 + 200);
    expect(g.state.office.items.length).toBe(n);
  });
  it('protects the last desk and the last showcase shelf, and refuses unaffordable or locked items', () => {
    const g = newGame(100);
    const desk = founderDesk(g.state.office)!;
    expect(g.dispatch({ type: 'sell_item', uid: desk.uid })).toEqual({ ok: false, error: 'last_desk' });
    const shelf = g.state.office.items.find((i) => i.defId === 'bookshelf')!;
    expect(g.dispatch({ type: 'sell_item', uid: shelf.uid })).toEqual({ ok: false, error: 'last_showcase' });
    expect(g.dispatch({ type: 'buy_item', defId: 'sofa', x: 0, z: 6, rot: 0 })).toEqual({ ok: false, error: 'not_enough_money' });
    g.state.company.money = 1e6;
    expect(g.dispatch({ type: 'buy_item', defId: 'server_rack', x: 0, z: 6, rot: 0 })).toEqual({ ok: false, error: 'item_locked' });
  });
  it('mounting a computer replaces the old one and refunds half of it', () => {
    const g = newGame(5000);
    expect(g.dispatch({ type: 'mount_item', defId: 'pc_dev', deskUid: deskUid(g) }).ok).toBe(true);
    expect(founderDesk(g.state.office)!.mounts!.computer).toBe('pc_dev');
    expect(g.state.company.money).toBe(5000 - 1400 + 150);
    expect(g.dispatch({ type: 'mount_item', defId: 'pc_dev', deskUid: deskUid(g) })).toEqual({ ok: false, error: 'already_mounted' });
  });
  it('every placed item with a use spot keeps it inside the room', () => {
    const s = createNewGame(1);
    for (const it of s.office.items) {
      const sp = useSpot(it);
      if (!sp) continue;
      expect(sp.vx).toBeGreaterThan(0);
      expect(sp.vz).toBeGreaterThan(0);
      expect(sp.vx).toBeLessThan(60);
      expect(sp.vz).toBeLessThan(48);
    }
  });
});

describe('office effects (LS.4)', () => {
  it('the starting office is neutral', () => {
    const fx = officeEffects(createNewGame(1).office);
    expect([fx.techSpeed, fx.designSpeed, fx.fatigue, fx.inspiration, fx.rest, fx.coffee, fx.upkeep]).toEqual([1, 1, 1, 1, 0, 0, 0]);
  });
  it('effects do not stack: two whiteboards or two coffee machines count once; decoration saturates', () => {
    const g = newGame(1e6);
    expect(g.dispatch({ type: 'buy_item', defId: 'whiteboard', x: 6, z: 3, rot: 0 }).ok).toBe(true);
    const one = officeEffects(g.state.office);
    expect(g.dispatch({ type: 'buy_item', defId: 'whiteboard', x: 5, z: 6, rot: 0 }).ok).toBe(true);
    const two = officeEffects(g.state.office);
    expect(two.inspiration).toBe(one.inspiration);
    expect(one.inspiration).toBeGreaterThan(1);
  });
  it('daily running costs are charged', () => {
    const plain = autoplay({ seed: 1, money: 20000 });
    const coffee = autoplay({ seed: 1, money: 20000, setup: [{ type: 'buy_item', defId: 'coffee_machine', x: 6, z: 0, rot: 0 }] });
    const days = coffee.state.day - 1;
    expect(plain.state.company.money - coffee.state.company.money).toBeGreaterThan(350 + days * 5 * 0.9 - 6000);
    expect(coffee.state.empirians[0]!.energy).toBeGreaterThanOrEqual(0);
  });
  it('the right computer depends on the kind of game; the most expensive one is not always best', () => {
    const mount = (defId: string): Command[] => [{ type: 'mount_item', defId, deskUid: 'I-start-1' }];
    const plan = (topicId: string, focus: number) => ({ topicId, focus, days: 49, money: 12000 });
    const techGame = {
      dev: avg({ ...plan('robots', 0.75), setup: mount('pc_dev') }),
      work: avg({ ...plan('robots', 0.75), setup: mount('pc_workstation') }),
      creative: avg({ ...plan('robots', 0.75), setup: mount('pc_creative') }),
    };
    const designGame = {
      dev: avg({ ...plan('cat-puzzle', 0.25), setup: mount('pc_dev') }),
      work: avg({ ...plan('cat-puzzle', 0.25), setup: mount('pc_workstation') }),
      creative: avg({ ...plan('cat-puzzle', 0.25), setup: mount('pc_creative') }),
    };
    expect(techGame.work.score).toBeGreaterThan(techGame.creative.score);
    expect(designGame.creative.score).toBeGreaterThan(designGame.work.score);
    // On a single game no computer pays for itself: equipment is a long-term investment.
    const none = avg(plan('robots', 0.75));
    expect(techGame.work.profit).toBeLessThan(none.profit);
  });
  it('an ergonomic chair reduces fatigue and a sofa speeds up recovery', () => {
    const plan = { days: 70, size: 'medium' as const, money: 20000 };
    const base = avg(plan);
    const ergo = avg({ ...plan, setup: [{ type: 'mount_item', defId: 'chair_ergo', deskUid: 'I-start-1' }] });
    expect(ergo.score).toBeGreaterThan(base.score);
    const g = newGame(5000);
    g.state.empirians[0]!.energy = 20;
    for (let i = 0; i < 8; i++) g.tick();
    const plainRecovery = g.state.empirians[0]!.energy - 20;
    const g2 = newGame(5000);
    expect(g2.dispatch({ type: 'buy_item', defId: 'sofa', x: 3, z: 6, rot: 2 }).ok).toBe(true);
    g2.state.empirians[0]!.energy = 20;
    for (let i = 0; i < 8; i++) g2.tick();
    expect(g2.state.empirians[0]!.energy - 20).toBeGreaterThan(plainRecovery);
  });
  it('office survives save/load and old saves get the starting office', () => {
    const g = newGame(5000);
    expect(g.dispatch({ type: 'buy_item', defId: 'whiteboard', x: 6, z: 3, rot: 0 }).ok).toBe(true);
    expect(deserialize(serialize(g.state, { gameVersion: 't', savedAt: 't' }))).toEqual(g.state);
    const old = deserialize(readFileSync('tests/fixtures/save-v1-released.empires', 'utf8'));
    expect(old.office.items.map((i) => i.defId).sort()).toEqual(STARTING_ITEMS.map((i) => i.defId).sort());
  });
});
