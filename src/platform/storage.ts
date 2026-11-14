/**
 * Save storage adapters (D-012). The game talks to the SaveStorage interface;
 * web uses localStorage (saves are small JSON), tests use memory. A Capacitor
 * Filesystem adapter will be added when the native builds exist (F1.11).
 */
export interface SaveStorage {
  read(slot: string): string | null;
  write(slot: string, data: string): void;
  remove(slot: string): void;
}

export class MemoryStorage implements SaveStorage {
  private m = new Map<string, string>();
  read(slot: string) { return this.m.get(slot) ?? null; }
  write(slot: string, data: string) { this.m.set(slot, data); }
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
  write(slot: string, data: string): void {
    try {
      // Keep the previous autosave as a backup against corruption.
      if (slot === 'auto') {
        const prev = localStorage.getItem(PREFIX + 'auto');
        if (prev) localStorage.setItem(PREFIX + 'auto.bak', prev);
      }
      localStorage.setItem(PREFIX + slot, data);
    } catch (e) {
      console.warn('Save failed', e);
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
