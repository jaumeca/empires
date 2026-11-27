import type { GameState } from '../model/state';
import { canPlace } from './office';
import { record } from '../core/ledger';

/**
 * Undo the last decoration change (0.21.0, QoL). Exactly reverses what was paid
 * or received, so nothing can be duplicated or lost:
 * - only the last change, and only while no game time has passed (decorating pauses the game);
 * - the object must still be as it was; the old place must still be free.
 * Returns an error code, or null when undone.
 */
export function undoDecor(state: GameState): string | null {
  const c = state.office.lastChange;
  if (!c) return 'nothing_to_undo';
  if (c.tick !== state.tick) { delete state.office.lastChange; return 'nothing_to_undo'; }
  const items = state.office.items;
  switch (c.kind) {
    case 'buy': {
      const idx = items.findIndex((i) => i.uid === c.uid);
      if (idx < 0 || items[idx]!.assignedTo) return 'cannot_undo';
      items.splice(idx, 1);
      state.company.money += c.paid;
      break;
    }
    case 'move': {
      const it = items.find((i) => i.uid === c.uid);
      if (!it || canPlace(state.office, it.defId, c.from.x, c.from.z, c.from.rot, it.uid)) return 'cannot_undo';
      it.x = c.from.x; it.z = c.from.z; it.rot = c.from.rot;
      break;
    }
    case 'sell': {
      if (items.some((i) => i.uid === c.item.uid) || canPlace(state.office, c.item.defId, c.item.x, c.item.z, c.item.rot)) return 'cannot_undo';
      if (state.company.money < c.refund) return 'not_enough_money';
      items.splice(Math.min(c.index, items.length), 0, c.item);
      state.company.money -= c.refund;
      break;
    }
    case 'mount': {
      const desk = items.find((i) => i.uid === c.deskUid);
      if (!desk) return 'cannot_undo';
      desk.mounts = { ...desk.mounts, [c.slot]: c.old };
      if (!c.old) delete desk.mounts[c.slot];
      state.company.money += c.paid - c.refund;
      break;
    }
  }
  delete state.office.lastChange;
  record(state, { kind: 'office', text: { key: 'ledger.office.undone' }, causes: [], tone: 0 });
  return null;
}
