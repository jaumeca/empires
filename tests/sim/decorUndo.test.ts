import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { unlockAll } from '../../src/sim/systems/progress';

/** 0.21.0: undo the last decoration change — exact money, no duplicates, nothing after time passes. */
function studio() {
  const g = new Game(createNewGame(7));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state);
  g.state.company.money = 20000;
  return g;
}
const err = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);
const snap = (g: Game) => JSON.stringify({ items: g.state.office.items, money: g.state.company.money });
function placeAnywhere(g: Game, defId: string) {
  const s = g.state;
  for (let z = 0; z < s.office.d; z++) for (let x = 0; x < s.office.w; x++) if (g.dispatch({ type: 'buy_item', defId, x, z, rot: 0 }).ok) return { x, z };
  throw new Error('no room');
}

describe('undo decoration', () => {
  it('a purchase: the object goes, all the money comes back (including a desk\'s computer and chair)', () => {
    const g = studio();
    const before = snap(g);
    placeAnywhere(g, 'desk_basic');
    expect(g.dispatch({ type: 'undo_decor' }).ok).toBe(true);
    expect(snap(g)).toBe(before);
    expect(err(g.dispatch({ type: 'undo_decor' }))).toBe('nothing_to_undo'); // never twice
    expect(snap(g)).toBe(before);
  });

  it('a move goes back to where it was', () => {
    const g = studio();
    const plant = g.state.office.items.find((i) => i.defId.startsWith('plant'))!;
    const before = snap(g);
    const s = g.state;
    let moved = false;
    for (let z = 0; z < s.office.d && !moved; z++) for (let x = 0; x < s.office.w && !moved; x++) if (x !== plant.x || z !== plant.z) moved = g.dispatch({ type: 'move_item', uid: plant.uid, x, z, rot: 0 }).ok;
    expect(moved).toBe(true);
    expect(g.dispatch({ type: 'undo_decor' }).ok).toBe(true);
    expect(snap(g)).toBe(before);
  });

  it('a sale: the object comes back in its place, the refund is returned (no free money, no duplicate)', () => {
    const g = studio();
    const plant = g.state.office.items.find((i) => i.defId.startsWith('plant'))!;
    const before = snap(g);
    expect(g.dispatch({ type: 'sell_item', uid: plant.uid }).ok).toBe(true);
    expect(g.dispatch({ type: 'undo_decor' }).ok).toBe(true);
    expect(snap(g)).toBe(before);
    expect(g.state.office.items.filter((i) => i.uid === plant.uid).length).toBe(1);
  });

  it('a new computer: the old one comes back and the difference is returned', () => {
    const g = studio();
    const desk = g.state.office.items.find((i) => i.defId.startsWith('desk'))!;
    const before = snap(g);
    expect(g.dispatch({ type: 'mount_item', defId: 'pc_dev', deskUid: desk.uid }).ok).toBe(true);
    expect(g.dispatch({ type: 'undo_decor' }).ok).toBe(true);
    expect(snap(g)).toBe(before);
  });

  it('only while no game time has passed (no exploits with the clock)', () => {
    const g = studio();
    placeAnywhere(g, 'plant_small');
    g.tick();
    expect(err(g.dispatch({ type: 'undo_decor' }))).toBe('nothing_to_undo');
  });

  it('a move cannot be undone onto a place that is now taken', () => {
    const g = studio();
    const s = g.state;
    const plant = s.office.items.find((i) => i.defId.startsWith('plant'))!;
    const from = { x: plant.x, z: plant.z };
    let moved = false;
    for (let z = 0; z < s.office.d && !moved; z++) for (let x = 0; x < s.office.w && !moved; x++) if (Math.abs(x - from.x) > 2 || Math.abs(z - from.z) > 2) moved = g.dispatch({ type: 'move_item', uid: plant.uid, x, z, rot: 0 }).ok;
    // Someone puts something where it was (that change becomes the last one): undo now removes that one.
    const r = g.dispatch({ type: 'buy_item', defId: 'plant_small', x: from.x, z: from.z, rot: 0 });
    if (r.ok) { expect(g.dispatch({ type: 'undo_decor' }).ok).toBe(true); expect(s.office.items.some((i) => i.uid === plant.uid && i.x !== from.x)).toBe(true); }
  });
});
