import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { officeVibes, officeZones } from '../../src/sim/systems/officeZones';
import { officeEffects } from '../../src/sim/systems/office';
import { unlockAll } from '../../src/sim/systems/progress';
import { es } from '../../src/i18n/es';
import { en } from '../../src/i18n/en';
import type { Office } from '../../src/sim/model/state';

/** 0.22.0 (D-072): zones emerge from the furniture; the office has a (combinable) style. */
function game() {
  const g = new Game(createNewGame(3));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state);
  g.state.company.money = 200000;
  g.dispatch({ type: 'expand_office' });
  return g;
}
const buy = (g: Game, defId: string, x: number, z: number, rot: 0 | 1 | 2 | 3 = 0) => {
  const r = g.dispatch({ type: 'buy_item', defId, x, z, rot });
  expect(r.ok, `${defId} at ${x},${z}: ${r.ok ? '' : r.error}`).toBe(true);
};
const bare = (o: Office): Office => ({ ...o, items: o.items.filter((i) => i.defId === 'desk_basic') });

describe('office zones (D-072)', () => {
  it('a games corner appears when an arcade and a TV are close, not when they are far apart', () => {
    const g = game();
    g.state.office = bare(g.state.office);
    buy(g, 'tv_corner', 10, 0);
    buy(g, 'arcade', 0, 6);
    expect(officeZones(g.state.office).map((z) => z.kind)).not.toContain('games');
    g.dispatch({ type: 'move_item', uid: g.state.office.items.find((i) => i.defId === 'arcade')!.uid, x: 11, z: 3, rot: 0 });
    const games = officeZones(g.state.office).find((z) => z.kind === 'games');
    expect(games).toBeDefined();
    expect(games!.size).toBe(2);
  });

  it('a meeting area from a meeting table and a whiteboard; two rugs alone are not a rest zone', () => {
    const g = game();
    g.state.office = bare(g.state.office);
    buy(g, 'meeting_table', 4, 7);
    buy(g, 'whiteboard', 8, 8);
    buy(g, 'rug_round', 10, 6);
    buy(g, 'rug_checker', 0, 2);
    const kinds = officeZones(g.state.office).map((z) => z.kind);
    expect(kinds).toContain('meeting');
    expect(kinds).not.toContain('rest');
  });

  it('describes, never pays: zones and style have no effect on the simulation', () => {
    const g = game();
    const before = JSON.stringify(officeEffects(g.state.office));
    officeZones(g.state.office); officeVibes(g.state.office);
    expect(JSON.stringify(officeEffects(g.state.office))).toBe(before);
  });
});

describe('office style (D-072)', () => {
  it('the starting office has no imposed style beyond a light one', () => {
    const g = game();
    expect(officeVibes(g.state.office).length).toBeLessThanOrEqual(1);
  });

  it('brick, concrete floor and a tall cabinet read industrial; a sofa, lamps and plants make it cozy too', () => {
    const g = game();
    g.state.office = bare(g.state.office);
    g.dispatch({ type: 'set_office_style', wall: 'brick', floor: 'concrete' });
    buy(g, 'tall_cabinet', 0, 6, 1);
    expect(officeVibes(g.state.office)[0]).toBe('industrial');
    buy(g, 'sofa', 4, 7); buy(g, 'lamp_arc', 9, 7); buy(g, 'monstera', 10, 8); buy(g, 'rug_round', 9, 3); buy(g, 'armchair', 12, 4);
    expect(new Set(officeVibes(g.state.office))).toEqual(new Set(['industrial', 'cozy']));
  });

  it('arcade, console and a checker floor: retro; a nearly empty white office: minimal (modern)', () => {
    const g = game();
    g.state.office = bare(g.state.office);
    g.dispatch({ type: 'set_office_style', wall: 'white', floor: 'whitetile' });
    expect(officeVibes(g.state.office)).toContain('minimal');
    g.dispatch({ type: 'set_office_style', wall: 'coral', floor: 'checker' });
    buy(g, 'arcade', 11, 3); buy(g, 'retro_console', 8, 0);
    expect(officeVibes(g.state.office)[0]).toBe('retro');
  });
});

describe('office identity texts', () => {
  it('every zone and style has a name in both languages', () => {
    for (const k of ['games', 'meeting', 'library', 'rest', 'kitchen', 'garden', 'work']) { expect(es).toHaveProperty(`zone.${k}`); expect(en).toHaveProperty(`zone.${k}`); }
    for (const k of ['industrial', 'cozy', 'retro', 'modern', 'minimal', 'creative']) { expect(es).toHaveProperty(`vibe.${k}`); expect(en).toHaveProperty(`vibe.${k}`); }
  });
});
