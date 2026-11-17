import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { blockedCells, canPlace } from '../../src/sim/systems/office';
import { maxEmployees } from '../../src/sim/systems/team';
import { OFFICE_SIZES } from '../../src/content/officeSizes';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { Office, Rot } from '../../src/sim/model/state';

/** AW.E.1 — a bigger studio: more room and people, everything kept, a real cost. */
function game() {
  const g = new Game(createNewGame(1));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  return g;
}
function connected(office: Office): boolean {
  const b = blockedCells(office);
  const free: number[] = [];
  for (let i = 0; i < office.w * office.d; i++) if (!b[i]) free.push(i);
  const seen = new Set([free[0]!]);
  const q = [free[0]!];
  while (q.length) {
    const c = q.shift()!;
    const x = c % office.w, z = Math.floor(c / office.w);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx!, nz = z + dz!;
      if (nx < 0 || nz < 0 || nx >= office.w || nz >= office.d) continue;
      const k = nx + nz * office.w;
      if (!b[k] && !seen.has(k)) { seen.add(k); q.push(k); }
    }
  }
  return seen.size === free.length;
}
function desks(g: Game): number {
  let n = 0;
  const s = g.state;
  for (let z = 0; z < s.office.d; z++) for (let x = 0; x < s.office.w; x++) for (const rot of [0, 1, 2, 3] as Rot[])
    if (!canPlace(s.office, 'desk_basic', x, z, rot) && g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok) n++;
  return n;
}

describe('bigger studio (AW.E.1)', () => {
  it('costs real money and is refused without it', () => {
    const g = game();
    g.state.company.money = 1000;
    expect(g.dispatch({ type: 'expand_office' })).toEqual({ ok: false, error: 'not_enough_money' });
    g.state.company.money = 40000;
    expect(g.dispatch({ type: 'expand_office' }).ok).toBe(true);
    expect(g.state.company.money).toBe(40000 - OFFICE_SIZES.studio.price);
    expect(g.dispatch({ type: 'expand_office' })).toEqual({ ok: false, error: 'office_max' });
  });

  it('keeps every item, the team and the routes; grows the grid and the team limit', () => {
    const g = game();
    g.state.company.money = 60000;
    const items = JSON.stringify(g.state.office.items);
    const people = JSON.stringify(g.state.empirians);
    expect(maxEmployees(g.state)).toBe(OFFICE_SIZES.room.maxEmployees);
    g.dispatch({ type: 'expand_office' });
    expect(JSON.stringify(g.state.office.items)).toBe(items);
    expect(JSON.stringify(g.state.empirians)).toBe(people);
    expect([g.state.office.w, g.state.office.d]).toEqual([OFFICE_SIZES.studio.w, OFFICE_SIZES.studio.d]);
    expect(maxEmployees(g.state)).toBe(OFFICE_SIZES.studio.maxEmployees);
    expect(connected(g.state.office)).toBe(true);
    expect(g.state.story.memories.some((m) => m.kind === 'office_moved')).toBe(true);
  });

  it('really fits more desks than the starting room (and stays walkable)', () => {
    const small = game();
    small.state.company.money = 60000;
    const inRoom = desks(small);
    const big = game();
    big.state.company.money = 80000;
    big.dispatch({ type: 'expand_office' });
    const inStudio = desks(big);
    expect(inStudio).toBeGreaterThanOrEqual(inRoom + 3);
    expect(inStudio).toBeGreaterThanOrEqual(OFFICE_SIZES.studio.maxEmployees - 1);
    expect(connected(big.state.office)).toBe(true);
  });

  it('charges the rent every day', () => {
    const a = game(), b = game();
    for (const g of [a, b]) g.state.company.money = 50000;
    b.dispatch({ type: 'expand_office' });
    const ma = a.state.company.money, mb = b.state.company.money;
    for (let i = 0; i < 8 * 10; i++) { a.tick(); b.tick(); }
    expect((ma - a.state.company.money) - (mb - b.state.company.money)).toBeCloseTo(-OFFICE_SIZES.studio.rent * 10, 5);
  });

  it('survives save/load; older saves are the starting room', () => {
    const g = game();
    g.state.company.money = 50000;
    g.dispatch({ type: 'expand_office' });
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(back.office.size).toBe('studio');
    expect(back.office.w).toBe(14);
    const fresh = game();
    expect(fresh.state.office.size).toBeUndefined();
    expect(maxEmployees(fresh.state)).toBe(3);
  });
});
