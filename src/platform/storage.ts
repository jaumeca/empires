/**
 * Save storage adapters (D-012). The game talks to the SaveStorage interface;
 * web uses localStorage (saves are small JSON), tests use memory. A Capacitor
 * Filesystem adapter will be added when the native builds exist (F1.11).
 */
export interface SaveStorage {
  read(slot: string): string | null;
  /** Returns false if the write failed (e.g. storage quota exceeded). */
  write(slot: string, data: string): boolean;
  remove(slot: string): void;
}

/** In-memory storage for tests, with fault injection. */
export class MemoryStorage implements SaveStorage {
  readonly m = new Map<string, string>();
  /** Simulate quota errors / truncated writes. */
  fault: 'none' | 'fail' | 'truncate' = 'none';
  read(slot: string) { return this.m.get(slot) ?? null; }
  write(slot: string, data: string) {
    if (this.fault === 'fail') return false;
    this.m.set(slot, this.fault === 'truncate' ? data.slice(0, Math.floor(data.length / 2)) : data);
    return true;
  }
  remove(slot: string) { this.m.delete(slot); }
}

const PREFIX = 'empires.save.';

export class LocalSaveStorage implements SaveStorage {
  read(slot: string): string | null {
    try {
      return localStorage.getItem(PREFIX + slot);
    } catch {
      return null;
    }
  }
  write(slot: string, data: string): boolean {
    try {
      localStorage.setItem(PREFIX + slot, data);
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  }
  remove(slot: string): void {
    try {
      localStorage.removeItem(PREFIX + slot);
    } catch {
      /* ignore */
    }
  }
}

/** Browser download of a save file. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Opens a file picker and resolves with the file's text. */
export function pickTextFile(accept = '.empires,.json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

/** Calls `onHide` when the app goes to background or is closing (D-013). */
export function onAppHidden(onHide: () => void): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
  window.addEventListener('pagehide', onHide);
}
