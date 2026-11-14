import type { GameState } from '../sim/model/state';
import { deserialize, SaveError, serialize } from '../sim/save/save';
import type { SaveStorage } from './storage';

/**
 * Save policy (D-012, D-029):
 * - Slots: `auto` (current) → `auto.bak1` → `auto.bak2` (rotating backups).
 * - Verified writes: the new save is serialized, parsed back and compared
 *   BEFORE it replaces anything; it is first written to `auto.tmp` and read
 *   back, so a failed/truncated write (quota) never destroys the good save.
 * - Recovery: on load, slots are tried newest → oldest; the first valid one
 *   wins and the player is told if a backup was used.
 * - Quarantine: a damaged or newer-version slot is copied to `quarantine.<slot>`
 *   before anything can overwrite it, so the player (or support) can recover it.
 * - Importing goes through the same path, so the replaced game ends up in a backup.
 */
export const SLOTS = ['auto', 'auto.bak1', 'auto.bak2'] as const;

export interface LoadResult {
  state: GameState | null;
  source: string | null;
  /** True when the newest save was unusable and an older backup was loaded. */
  recovered: boolean;
  problems: { slot: string; code: string }[];
  quarantined: string[];
}

export interface SaveMeta {
  gameVersion: string;
  now: () => string;
}

export class SaveManager {
  constructor(
    private storage: SaveStorage,
    private meta: SaveMeta,
  ) {}

  /** Returns true if the save was written and verified. */
  save(state: GameState): boolean {
    let text: string;
    try {
      text = serialize(state, { gameVersion: this.meta.gameVersion, savedAt: this.meta.now() });
      // Verify the round trip before touching storage.
      if (JSON.stringify(deserialize(text)) !== JSON.stringify(state)) return false;
    } catch {
      return false;
    }
    if (!this.storage.write('auto.tmp', text) || this.storage.read('auto.tmp') !== text) {
      this.storage.remove('auto.tmp');
      return false;
    }
    const current = this.storage.read('auto');
    // Only rotate backups when the current save is different (avoid filling backups with duplicates).
    if (current && current !== text && this.isValid(current)) {
      const b1 = this.storage.read('auto.bak1');
      if (b1) this.storage.write('auto.bak2', b1);
      this.storage.write('auto.bak1', current);
    }
    const ok = this.storage.write('auto', text) && this.storage.read('auto') === text;
    this.storage.remove('auto.tmp');
    return ok;
  }

  load(): LoadResult {
    const res: LoadResult = { state: null, source: null, recovered: false, problems: [], quarantined: [] };
    // `auto.bak` is the single-backup slot used before D-029; still read for compatibility.
    for (const slot of [...SLOTS, 'auto.bak']) {
      const text = this.storage.read(slot);
      if (!text) continue;
      try {
        res.state = deserialize(text);
        res.source = slot;
        res.recovered = res.problems.length > 0;
        return res;
      } catch (e) {
        const code = e instanceof SaveError ? e.code : 'unknown';
        res.problems.push({ slot, code });
        const q = `quarantine.${slot}`;
        if (this.storage.read(q) !== text && this.storage.write(q, text)) res.quarantined.push(q);
      }
    }
    return res;
  }

  /** Validates an imported file; on success it becomes the current save (old one rotates to backup). */
  importText(text: string): GameState {
    const state = deserialize(text); // throws SaveError with a code
    if (!this.save(state)) throw new SaveError('write_failed');
    return state;
  }

  /** New game: keep the previous game as a backup instead of deleting it. */
  startOver(): void {
    const current = this.storage.read('auto');
    if (current && this.isValid(current)) {
      const b1 = this.storage.read('auto.bak1');
      if (b1) this.storage.write('auto.bak2', b1);
      this.storage.write('auto.bak1', current);
    }
    this.storage.remove('auto');
  }

  private isValid(text: string): boolean {
    try {
      deserialize(text);
      return true;
    } catch {
      return false;
    }
  }
}
