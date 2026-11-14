import { Game } from '../sim/game';
import { createNewGame } from '../sim/state';
import { deserialize, SaveError, serialize } from '../sim/save/save';
import type { SimEvent } from '../sim/core/events';
import { OfficeScene, type CameraMode } from '../render/officeScene';
import { GameUI } from '../ui/gameUI';
import { downloadText, LocalSaveStorage, onAppHidden, pickTextFile } from '../platform/storage';
import { CATALOGS, setLocale, t, type Locale } from '../i18n/i18n';

const GAME_VERSION = '0.1.0-dev';
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const storage = new LocalSaveStorage();

// Language: ?lang=en > saved preference > Spanish (default).
const savedLocale = (() => { try { return localStorage.getItem('empires.locale'); } catch { return null; } })();
const wantedLocale = params.get('lang') ?? savedLocale ?? 'es';
setLocale((wantedLocale in CATALOGS ? wantedLocale : 'es') as Locale);
document.documentElement.lang = wantedLocale in CATALOGS ? wantedLocale : 'es';

function loadOrCreate(): Game {
  if (!params.has('fresh')) {
    for (const slot of ['auto', 'auto.bak']) {
      const text = storage.read(slot);
      if (!text) continue;
      try {
        return new Game(deserialize(text));
      } catch (e) {
        console.warn(`Could not load ${slot}`, e);
      }
    }
  }
  const seed = params.has('seed') ? Number(params.get('seed')) : (Date.now() % 2147483647);
  return new Game(createNewGame(seed));
}

let game = loadOrCreate();
const savedCam = (() => { try { return localStorage.getItem('empires.camera'); } catch { return null; } })();
const camMode: CameraMode = (params.get('cam') as CameraMode) ?? (savedCam === 'iso' ? 'iso' : 'dim');
const scene = new OfficeScene(document.getElementById('stage')!, camMode);

const services = {
  save(): void {
    storage.write('auto', serialize(game.state, { gameVersion: GAME_VERSION, savedAt: new Date().toISOString() }));
  },
  exportSave(): void {
    const name = game.state.company.name.replace(/[^\w-]+/g, '_') || 'partida';
    downloadText(`${name}-dia${game.state.day}.empires`, serialize(game.state, { gameVersion: GAME_VERSION, savedAt: new Date().toISOString() }));
  },
  async importSave(): Promise<void> {
    const text = await pickTextFile();
    if (!text) return;
    try {
      switchGame(new Game(deserialize(text)));
      services.save();
      ui.toast(t('toast.imported'), 'check');
    } catch (e) {
      ui.toast(e instanceof SaveError ? t(`save.error.${e.code}`) : t('toast.import_failed'), 'alert');
    }
  },
  newGame(): void {
    storage.remove('auto');
    switchGame(new Game(createNewGame(Date.now() % 2147483647)));
  },
  setLocale(l: Locale): void {
    try { localStorage.setItem('empires.locale', l); } catch { /* ignore */ }
    document.documentElement.lang = l;
  },
  setCamera(mode: CameraMode): void {
    scene.setCameraMode(mode);
    try { localStorage.setItem('empires.camera', mode); } catch { /* ignore */ }
  },
};

const ui = new GameUI(document.getElementById('ui')!, game, scene, services, debug);
let pending: SimEvent[] = [];
let unsubscribe = game.onUpdate((events) => pending.push(...events));

function switchGame(g: Game): void {
  unsubscribe();
  game = g;
  unsubscribe = game.onUpdate((events) => pending.push(...events));
  location.hash = '';
  // Simplest robust way to rebuild the scene for a different game: reload with the new autosave.
  storage.write('auto', serialize(game.state, { gameVersion: GAME_VERSION, savedAt: new Date().toISOString() }));
  location.reload();
}

scene.sync(game.state);
ui.start();

// F1.10 stress scene: extra cosmetic Empirians (render only, not in the simulation).
const stress = Math.min(30, Number(params.get('stress') ?? 0));
for (let i = 0; i < stress; i++) {
  const r = (n: number) => Math.floor(Math.random() * n);
  scene.ensureEmpirian(`stress-${i}`, { skin: r(8), hairStyle: r(8), hairColor: r(12), top: r(5), topColor: r(10), pantsColor: r(6), accessory: r(6) });
}

// Pause + save when the app goes to background or closes (D-013).
onAppHidden(() => {
  if (game.clock.speed !== 0) game.clock.setSpeed(0);
  if (game.state.setupComplete) services.save();
  ui.renderHud(true);
});

let last = performance.now();
const t0 = last;
let fps = 60;
function loop(now: number): void {
  const dtMs = Math.min(250, now - last);
  last = now;
  fps = fps * 0.95 + (1000 / Math.max(1, dtMs)) * 0.05;
  game.frame(dtMs);
  const t = (now - t0) / 1000;
  if (pending.length) {
    const evs = pending;
    pending = [];
    scene.sync(game.state);
    scene.handleEvents(evs, t);
    ui.handleEvents(evs);
  }
  scene.update(dtMs / 1000, t, game.clock.speed);
  ui.frame(fps);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.addEventListener('resize', () => scene.resize());

if (debug) {
  (window as unknown as Record<string, unknown>).__empires = {
    get game() { return game; },
    scene,
    ui,
    /** Advance n ticks instantly (test helper). */
    advance(n: number) { for (let i = 0; i < n && !game.state.pendingDecision; i++) game.tick(); },
  };
}
