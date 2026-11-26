/**
 * EMPIRES' first sound identity (0.18.0): soft, warm, short sounds made with
 * the Web Audio API (no files, no network, original by construction).
 *
 * - Three volumes (general, effects, ambience) and mute; saved in this
 *   browser only (not in the game save), never required: without audio the
 *   game works the same.
 * - Autoplay rules: the AudioContext is created on the first user gesture.
 * - Not tiring: each sound has a minimum interval, a cap on simultaneous voices
 *   and a little pitch variation so it never sounds exactly the same twice.
 * - Pause: world sounds (keyboards, the office) only play while the world runs;
 *   interface sounds always work.
 * Never imported by the simulation.
 */
export type Sfx =
  | 'click' | 'open' | 'close' | 'confirm' | 'error' | 'buy' | 'place' | 'unlock' | 'release' | 'celebrate'
  | 'notify' | 'decision' | 'coin' | 'bug' | 'idea' | 'fixed' | 'type';

export interface AudioPrefs { master: number; effects: number; ambience: number; muted: boolean }
export const DEFAULT_PREFS: AudioPrefs = { master: 0.7, effects: 0.8, ambience: 0.35, muted: false };
const PREFS_KEY = 'empires.audio';

/** Which bus a sound goes to: interface or world (world sounds stop with the pause). */
export const WORLD_SFX: ReadonlySet<Sfx> = new Set(['type', 'bug', 'idea', 'fixed', 'coin']);

/** Minimum seconds between two plays of the same sound (no machine-gun effect). */
export const MIN_GAP: Record<Sfx, number> = {
  click: 0.05, open: 0.1, close: 0.1, confirm: 0.15, error: 0.3, buy: 0.2, place: 0.2, unlock: 1, release: 2, celebrate: 1.5,
  notify: 0.6, decision: 1, coin: 0.8, bug: 0.5, idea: 1.2, fixed: 0.6, type: 0.07,
};
const MAX_VOICES = 10;

export function loadPrefs(storage: Pick<Storage, 'getItem'> | null): AudioPrefs {
  try {
    const raw = storage?.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw) as Partial<AudioPrefs>;
    const vol = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);
    return { master: vol(p.master, DEFAULT_PREFS.master), effects: vol(p.effects, DEFAULT_PREFS.effects), ambience: vol(p.ambience, DEFAULT_PREFS.ambience), muted: p.muted === true };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(storage: Pick<Storage, 'setItem'> | null, p: AudioPrefs): void {
  try { storage?.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode: keep it for this session */ }
}

/** A note: frequency (Hz), start offset and length (s), wave, peak gain. */
interface Note { f: number; at: number; len: number; wave?: OscillatorType; gain?: number; slideTo?: number }
/** Noise burst (keyboards, thuds). */
interface Noise { at: number; len: number; gain: number; filter: number }

/** The recipes: a few notes each, warm (sine/triangle), short decays. */
export function recipe(s: Sfx, v: number): { notes: Note[]; noise?: Noise[] } {
  const k = 1 + (v - 0.5) * 0.06; // ±3 % pitch variation
  const n = (f: number, at: number, len: number, wave: OscillatorType = 'sine', gain = 0.22, slideTo?: number): Note => ({ f: f * k, at, len, wave, gain, slideTo: slideTo ? slideTo * k : undefined });
  switch (s) {
    case 'click': return { notes: [n(1250, 0, 0.045, 'sine', 0.12, 950)] };
    case 'open': return { notes: [n(660, 0, 0.07, 'triangle', 0.12), n(880, 0.05, 0.08, 'triangle', 0.1)] };
    case 'close': return { notes: [n(880, 0, 0.06, 'triangle', 0.1), n(660, 0.045, 0.08, 'triangle', 0.09)] };
    case 'confirm': return { notes: [n(784, 0, 0.09, 'triangle', 0.16), n(1175, 0.07, 0.14, 'sine', 0.16)] };
    case 'error': return { notes: [n(330, 0, 0.12, 'triangle', 0.14), n(262, 0.1, 0.16, 'triangle', 0.14)] };
    case 'buy': return { notes: [n(988, 0, 0.08, 'square', 0.06), n(1319, 0.07, 0.22, 'sine', 0.18)] };
    case 'place': return { notes: [n(196, 0, 0.12, 'sine', 0.3, 110)], noise: [{ at: 0, len: 0.06, gain: 0.08, filter: 900 }] };
    case 'unlock': return { notes: [523, 659, 784, 1047].map((f, i) => n(f, i * 0.09, 0.28, 'triangle', 0.14)) };
    case 'release': return { notes: [...[523, 659, 784].map((f, i) => n(f, i * 0.12, 0.22, 'triangle', 0.15)), n(1047, 0.36, 0.6, 'sine', 0.18), n(784, 0.36, 0.6, 'sine', 0.08)] };
    case 'celebrate': return { notes: [1568, 2093, 1760, 2349, 2093].map((f, i) => n(f, i * 0.07 + v * 0.02, 0.18, 'sine', 0.07)) };
    case 'notify': return { notes: [n(1047, 0, 0.35, 'sine', 0.1), n(1568, 0, 0.3, 'sine', 0.04)] };
    case 'decision': return { notes: [n(698, 0, 0.16, 'triangle', 0.13), n(880, 0.12, 0.26, 'triangle', 0.13)] };
    case 'coin': return { notes: [n(1319, 0, 0.06, 'square', 0.035), n(1760, 0.05, 0.14, 'sine', 0.08)] };
    case 'bug': return { notes: [n(220, 0, 0.09, 'triangle', 0.08, 180)] };
    case 'idea': return { notes: [n(1397, 0, 0.12, 'sine', 0.07), n(2093, 0.08, 0.22, 'sine', 0.06)] };
    case 'fixed': return { notes: [n(880, 0, 0.06, 'sine', 0.06), n(1175, 0.05, 0.1, 'sine', 0.06)] };
    case 'type': return { notes: [], noise: [{ at: 0, len: 0.018, gain: 0.05 + v * 0.03, filter: 2500 + v * 2500 }] };
  }
}

type Ctx = Pick<AudioContext, 'currentTime' | 'destination' | 'createGain' | 'createOscillator' | 'createBiquadFilter' | 'createBuffer' | 'createBufferSource' | 'sampleRate' | 'state' | 'resume'>;

export class SoundEngine {
  prefs: AudioPrefs;
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last = new Map<Sfx, number>();
  private voices: number[] = [];
  private n = 0;
  private ambienceOn = false;
  /** World running (not paused): world sounds and the office ambience only then. */
  worldRunning = false;
  /** Plays performed (tests / diagnostics). */
  readonly log: Sfx[] = [];

  constructor(private readonly factory: (() => Ctx) | null, private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null, private readonly now: () => number = () => performance.now() / 1000) {
    this.prefs = loadPrefs(storage);
  }

  /** Call on a user gesture: creates (or resumes) the audio context. Safe to call often. */
  unlock(): void {
    if (!this.factory) return;
    try {
      if (!this.ctx) {
        this.ctx = this.factory();
        this.master = this.ctx.createGain();
        this.effects = this.ctx.createGain();
        this.ambienceGain = this.ctx.createGain();
        this.effects.connect(this.master);
        this.ambienceGain.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applyPrefs();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // no audio: the game goes on in silence
    }
  }

  get ready(): boolean { return !!this.ctx; }

  setPrefs(p: Partial<AudioPrefs>): void {
    this.prefs = { ...this.prefs, ...p };
    savePrefs(this.storage, this.prefs);
    this.applyPrefs();
  }

  private applyPrefs(): void {
    if (!this.ctx || !this.master || !this.effects || !this.ambienceGain) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.prefs.muted ? 0 : this.prefs.master, t, 0.03);
    this.effects.gain.setTargetAtTime(this.prefs.effects, t, 0.03);
    this.ambienceGain.gain.setTargetAtTime(this.worldRunning ? this.prefs.ambience * 0.5 : 0, t, 0.4);
  }

  /** Whether a sound would play now (rate limits, mute, pause, voices). */
  canPlay(s: Sfx): boolean {
    if (!this.ctx || this.prefs.muted || this.prefs.master <= 0 || this.prefs.effects <= 0) return false;
    if (WORLD_SFX.has(s) && !this.worldRunning) return false;
    const now = this.now();
    if (now - (this.last.get(s) ?? -99) < MIN_GAP[s]) return false;
    this.voices = this.voices.filter((end) => end > now);
    return this.voices.length < MAX_VOICES;
  }

  play(s: Sfx): void {
    if (!this.canPlay(s)) return;
    const ctx = this.ctx!;
    const now = this.now();
    this.last.set(s, now);
    const v = ((this.n++ * 0.6180339887) % 1); // golden-ratio steps: varied, never random
    const r = recipe(s, v);
    const t0 = ctx.currentTime + 0.005;
    let end = 0;
    for (const note of r.notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = note.wave ?? 'sine';
      osc.frequency.setValueAtTime(note.f, t0 + note.at);
      if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, t0 + note.at + note.len);
      const peak = note.gain ?? 0.2;
      g.gain.setValueAtTime(0.0001, t0 + note.at);
      g.gain.exponentialRampToValueAtTime(peak, t0 + note.at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + note.at + note.len);
      osc.connect(g); g.connect(this.effects!);
      osc.start(t0 + note.at); osc.stop(t0 + note.at + note.len + 0.02);
      end = Math.max(end, note.at + note.len);
    }
    for (const nz of r.noise ?? []) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = nz.filter; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(nz.gain, t0 + nz.at);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + nz.at + nz.len);
      src.connect(f); f.connect(g); g.connect(this.effects!);
      src.start(t0 + nz.at, 0, nz.len + 0.01);
      end = Math.max(end, nz.at + nz.len);
    }
    this.voices.push(now + end);
    this.log.push(s);
    if (this.log.length > 200) this.log.shift();
  }

  private noise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let x = 12345;
    for (let i = 0; i < len; i++) { x = (x * 1103515245 + 12345) >>> 0; d[i] = (x / 4294967296) * 2 - 1; }
    return (this.noiseBuf = buf);
  }

  /**
   * Per frame: the world's state. Keyboards while people type (each a soft
   * click, irregular), and a very soft room tone while the world runs.
   */
  private typeAcc = 0;
  world(dt: number, running: boolean, typists: number, speed: number): void {
    if (running !== this.worldRunning) { this.worldRunning = running; this.applyPrefs(); this.ensureAmbience(); }
    if (!running || typists <= 0 || !this.ctx) return;
    // ~5 key presses per second per typist at 1x (a little faster at higher speeds), never more than ~14/s.
    this.typeAcc += dt * Math.min(14, typists * 5 * Math.min(2, Math.max(1, speed)));
    while (this.typeAcc >= 1) { this.typeAcc -= 1 + ((this.n * 0.37) % 0.6) - 0.3; this.play('type'); }
  }

  /** The office room tone: filtered noise, very low, only while the world runs. */
  private ensureAmbience(): void {
    if (this.ambienceOn || !this.ctx || !this.ambienceGain) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise();
      (src as AudioBufferSourceNode).loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 380;
      const g = this.ctx.createGain();
      g.gain.value = 0.12;
      src.connect(f); f.connect(g); g.connect(this.ambienceGain);
      src.start();
      this.ambienceOn = true;
    } catch { /* no ambience */ }
  }
}
