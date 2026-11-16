import { Game } from '../sim/game';
import { createNewGame } from '../sim/state';
import { SaveError, serialize } from '../sim/save/save';
import { SaveManager } from '../platform/saveManager';
import type { SimEvent } from '../sim/core/events';
import { OfficeScene, type CameraMode } from '../render/officeScene';
import { GameUI } from '../ui/gameUI';
import { DEBUG_SAVE_PREFIX, downloadText, LocalSaveStorage, onAppHidden, pickTextFile, SAVE_PREFIX } from '../platform/storage';
import { BUILD_INFO } from './buildInfo';
import { WorldClock } from '../render/worldClock';
import { CATALOGS, setLocale, t, type Locale } from '../i18n/i18n';

const GAME_VERSION = BUILD_INFO.version;
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
/**
 * Debug/test sessions (?debug) play in a sandbox with their own save slots, so
 * test URLs (?debug&fresh, ?seed…) can never overwrite a real game. In a normal
 * session every URL parameter except lang/cam is ignored.
 */
const storage = new LocalSaveStorage(debug ? DEBUG_SAVE_PREFIX : SAVE_PREFIX);

// Language: ?lang=en > saved preference > Spanish (default).
const savedLocale = (() => { try { return localStorage.getItem('empires.locale'); } catch { return null; } })();
const wantedLocale = params.get('lang') ?? savedLocale ?? 'es';
setLocale((wantedLocale in CATALOGS ? wantedLocale : 'es') as Locale);
document.documentElement.lang = wantedLocale in CATALOGS ? wantedLocale : 'es';

const saves = new SaveManager(storage, { gameVersion: GAME_VERSION, now: () => new Date().toISOString() });
let startupNotice: string | null = null;
/** Set before a deliberate reload (import / new game) so the hide-autosave can't overwrite the new save. */
let reloading = false;

function loadOrCreate(): Game {
  if (!(debug && params.has('fresh'))) {
    const res = saves.load();
    if (res.problems.length) console.warn('Save problems', res.problems, 'quarantined', res.quarantined);
    if (res.state) {
      if (res.recovered) startupNotice = 'toast.recovered_backup';
      return new Game(res.state);
    }
  }
  const seed = debug && params.has('seed') ? Number(params.get('seed')) : (Date.now() % 2147483647);
  return new Game(createNewGame(seed));
}

let game = loadOrCreate();
const savedCam = (() => { try { return localStorage.getItem('empires.camera'); } catch { return null; } })();
const camMode: CameraMode = (params.get('cam') as CameraMode) ?? (savedCam === 'iso' ? 'iso' : 'dim');
const scene = new OfficeScene(document.getElementById('stage')!, camMode);

const services = {
  save(): void {
    if (!saves.save(game.state)) ui.toast(t('toast.save_failed'), 'alert');
  },
  exportSave(): void {
    const name = game.state.company.name.replace(/[^\w-]+/g, '_') || 'partida';
    downloadText(`${name}-dia${game.state.day}.empires`, serialize(game.state, { gameVersion: GAME_VERSION, savedAt: new Date().toISOString() }));
  },
  async importSave(): Promise<void> {
    const text = await pickTextFile();
    if (!text) return;
    try {
      saves.importText(text); // validated + previous game kept as backup
      sessionStorage.setItem('empires.notice', 'toast.imported');
      reloading = true;
      location.reload();
    } catch (e) {
      ui.toast(e instanceof SaveError ? t(`save.error.${e.code}`) : t('toast.import_failed'), 'alert');
    }
  },
  newGame(): void {
    saves.startOver(); // the previous game stays in a backup slot
    saves.save(createNewGame(Date.now() % 2147483647));
    reloading = true;
    location.reload();
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

const ui = new GameUI(document.getElementById('ui')!, game, scene, services, debug, BUILD_INFO);
let pending: SimEvent[] = [];
game.onUpdate((events) => pending.push(...events));


scene.sync(game.state);
// A loaded game appears with everyone already at their place and pose (even if it starts paused).
scene.settle();
ui.start();
try {
  const notice = startupNotice ?? sessionStorage.getItem('empires.notice');
  sessionStorage.removeItem('empires.notice');
  if (notice) setTimeout(() => ui.toast(t(notice), notice === 'toast.imported' ? 'check' : 'alert'), 600);
} catch { /* ignore */ }

// F1.10 stress scene: extra cosmetic Empirians (render only, not in the simulation).
const stress = debug ? Math.min(30, Number(params.get('stress') ?? 0)) : 0;
for (let i = 0; i < stress; i++) {
  const r = (n: number) => Math.floor(Math.random() * n);
  scene.ensureEmpirian(`stress-${i}`, { skin: r(8), hairStyle: r(8), hairColor: r(12), top: r(5), topColor: r(10), pantsColor: r(6), accessory: r(6) });
}

// Pause + save when the app goes to background or closes (D-013).
onAppHidden(() => {
  if (reloading) return;
  if (game.clock.speed !== 0) game.clock.setSpeed(0);
  if (game.state.setupComplete) services.save();
  ui.renderHud(true);
});

let last = performance.now();
let fps = 60;
/** World animation time: stops while the game is paused (see render/worldClock.ts). */
const world = new WorldClock();
function loop(now: number): void {
  const dtMs = Math.min(250, now - last);
  last = now;
  fps = fps * 0.95 + (1000 / Math.max(1, dtMs)) * 0.05;
  game.frame(dtMs);
  // Before the studio exists (founder creation) the world is not "paused": keep it alive.
  world.advance(dtMs / 1000, game.state.setupComplete ? game.clock.speed : 1);
  if (pending.length) {
    const evs = pending;
    pending = [];
    scene.sync(game.state);
    scene.handleEvents(evs, world.time);
    ui.handleEvents(evs);
  }
  scene.update(world.dt, world.time, game.clock.speed);
  ui.frame(fps);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.addEventListener('resize', () => scene.resize());

if (debug) {
  (window as unknown as Record<string, unknown>).__empires = {
    get game() { return game; },
    scene,
    world,
    ui,
    /** Advance n ticks instantly (test helper). */
    advance(n: number) { for (let i = 0; i < n && !game.state.pendingDecision; i++) game.tick(); },
  };
}
