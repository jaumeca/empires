import type { GameState } from '../model/state';
import { SCHEMA_VERSION } from '../state';
import { MIGRATIONS } from './migrations';

/**
 * Versioned save format (D-012). The simulation does not know about wall-clock
 * time; `savedAt` is provided by the platform layer.
 */
export interface SaveFile {
  format: 'empires-save';
  schemaVersion: number;
  gameVersion: string;
  savedAt: string;
  checksum: string;
  state: GameState;
}

export class SaveError extends Error {}

export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function serialize(state: GameState, meta: { gameVersion: string; savedAt: string }): string {
  const stateJson = JSON.stringify(state);
  const file = {
    format: 'empires-save',
    schemaVersion: state.schemaVersion,
    gameVersion: meta.gameVersion,
    savedAt: meta.savedAt,
    checksum: checksum(stateJson),
    state: JSON.parse(stateJson) as GameState,
  } satisfies SaveFile;
  return JSON.stringify(file);
}

/** Parses, validates, migrates. Throws SaveError with a clear message on failure. */
export function deserialize(text: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('El archivo de partida no es JSON válido.');
  }
  if (!raw || typeof raw !== 'object') throw new SaveError('Archivo de partida vacío o inválido.');
  const file = raw as Partial<SaveFile> & { state?: Record<string, unknown> };
  if (file.format !== 'empires-save') throw new SaveError('No es una partida de EMPIRES.');
  if (typeof file.schemaVersion !== 'number' || !file.state) throw new SaveError('Partida sin versión o sin estado.');
  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new SaveError(`La partida es de una versión más nueva del juego (v${file.schemaVersion}).`);
  }
  if (file.checksum !== checksum(JSON.stringify(file.state))) {
    throw new SaveError('La partida está dañada (checksum incorrecto).');
  }
  let state = file.state as Record<string, unknown>;
  for (let v = file.schemaVersion; v < SCHEMA_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveError(`No hay migración desde la versión ${v}.`);
    state = m(state);
  }
  validateState(state);
  return state as unknown as GameState;
}

function validateState(s: Record<string, unknown>): void {
  const required = ['schemaVersion', 'seed', 'rng', 'tick', 'day', 'company', 'empirians', 'projects', 'ledger'];
  for (const k of required) if (!(k in s)) throw new SaveError(`Falta el campo "${k}" en la partida.`);
  if (s.schemaVersion !== SCHEMA_VERSION) throw new SaveError('Migración incompleta.');
}
