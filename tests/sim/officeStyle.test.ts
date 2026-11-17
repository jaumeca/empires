import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { canPlace, cozyCorner, officeEffects } from '../../src/sim/systems/office';
import { STYLE_PRICE } from '../../src/content/officeStyles';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { Rot } from '../../src/sim/model/state';

/** AW.C.3 — finishes are aesthetic and paid; a cozy corner helps a little, once. */
function game() {
  const g = new Game(createNewGame(1));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.state.company.money = 20000;
  return g;
}

describe('office finishes and cozy corner (AW.C.3)', () => {
  it('pays only for what changes; unknown finishes and lack of money are refused', () => {
    const g = game();
    const m0 = g.state.company.money;
    expect(g.dispatch({ type: 'set_office_style', wall: 'cream', floor: 'oak' })).toEqual({ ok: true });
    expect(g.state.company.money).toBe(m0);
    expect(g.dispatch({ type: 'set_office_style', wall: 'mint' }).ok).toBe(true);
    expect(g.state.company.money).toBe(m0 - STYLE_PRICE.wall);
    expect(g.state.office.style).toEqual({ wall: 'mint', floor: 'oak' });
    expect(g.dispatch({ type: 'set_office_style', wall: 'gold' })).toEqual({ ok: false, error: 'unknown_style' });
    g.state.company.money = 10;
    expect(g.dispatch({ type: 'set_office_style', floor: 'tiles' })).toEqual({ ok: false, error: 'not_enough_money' });
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(back.office.style).toEqual({ wall: 'mint', floor: 'oak' });
  });

  it('finishes change nothing in the simulation', () => {
    const g = game();
    const fx = JSON.stringify(officeEffects(g.state.office));
    g.dispatch({ type: 'set_office_style', wall: 'lavender', floor: 'carpet' });
    expect(JSON.stringify(officeEffects(g.state.office))).toBe(fx);
  });

  it('a lamp or plant next to a rest seat makes a cozy corner: +1 rest, never stacking', () => {
    const g = game();
    const s = g.state;
    expect(cozyCorner(s.office)).toBe(false); // the starting room isn't cozy yet
    const rest0 = officeEffects(s.office).rest;
    const arm = s.office.items.find((i) => i.defId === 'armchair')!;
    const near = (defId: string) => {
      for (let dz = -2; dz <= 3; dz++) for (let dx = -2; dx <= 3; dx++) {
        const x = arm.x + dx, z = arm.z + dz;
        if (x >= 0 && z >= 0 && !canPlace(s.office, defId, x, z, 0 as Rot)) return g.dispatch({ type: 'buy_item', defId, x, z, rot: 0 }).ok;
      }
      return false;
    };
    expect(near('lamp_floor')).toBe(true);
    expect(cozyCorner(s.office)).toBe(true);
    expect(officeEffects(s.office).rest).toBe(rest0 + 1);
    near('plant_small');
    expect(officeEffects(s.office).rest).toBe(rest0 + 1); // a second one adds nothing
  });

  it('the new pieces are valid catalog items (beanbag rests, rugs are walkable)', () => {
    const g = game();
    const s = g.state;
    for (const id of ['beanbag', 'rug_round', 'side_table']) {
      let placed = false;
      for (let z = 0; z < 8 && !placed; z++) for (let x = 0; x < 10 && !placed; x++) if (!canPlace(s.office, id, x, z, 0 as Rot)) placed = g.dispatch({ type: 'buy_item', defId: id, x, z, rot: 0 }).ok;
      expect(placed, id).toBe(true);
    }
    expect(officeEffects(s.office).rest).toBeGreaterThanOrEqual(2);
  });
});
