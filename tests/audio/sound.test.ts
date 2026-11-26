import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, recipe, SoundEngine, type Sfx } from '../../src/audio/sound';

/** 0.18.0: first sound identity. A fake AudioContext records what would be played. */
function fakeCtx() {
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, gain: param() });
  const started: string[] = [];
  const ctx = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: {},
    resume: async () => {},
    createGain: () => node(),
    createOscillator: () => ({ type: 'sine', frequency: param(), connect() {}, start() { started.push('osc'); }, stop() {} }),
    createBiquadFilter: () => ({ type: 'lowpass', frequency: param(), Q: param(), connect() {} }),
    createBuffer: (_c: number, len: number) => { const d = new Float32Array(len); return { getChannelData: () => d }; },
    createBufferSource: () => ({ buffer: null, loop: false, connect() {}, start() { started.push('noise'); } }),
  };
  return { ctx, started };
}
function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}
function engine(clock = { t: 0 }, storage = memStorage()) {
  const f = fakeCtx();
  const e = new SoundEngine(() => f.ctx as unknown as AudioContext, storage, () => clock.t);
  return { e, f, clock, storage };
}

describe('sound engine', () => {
  it('stays silent until the first gesture (browser autoplay rules)', () => {
    const { e } = engine();
    e.play('click');
    expect(e.log).toEqual([]);
    e.unlock();
    e.play('click');
    expect(e.log).toEqual(['click']);
  });

  it('works without Web Audio at all (the game goes on in silence)', () => {
    const e = new SoundEngine(null, null);
    expect(() => { e.unlock(); e.play('release'); e.world(1, true, 3, 1); e.setPrefs({ muted: true }); }).not.toThrow();
    expect(e.log).toEqual([]);
  });

  it('mute and volumes are saved in this browser and survive a reload', () => {
    const { e, storage } = engine();
    e.setPrefs({ master: 0.4, ambience: 0.1, muted: true });
    const again = new SoundEngine(null, storage);
    expect(again.prefs).toEqual({ master: 0.4, effects: DEFAULT_PREFS.effects, ambience: 0.1, muted: true });
    e.unlock();
    e.play('click');
    expect(e.log).toEqual([]); // muted
  });

  it('broken or old preferences fall back to the defaults', () => {
    expect(loadPrefs({ getItem: () => '{nope' })).toEqual(DEFAULT_PREFS);
    expect(loadPrefs({ getItem: () => JSON.stringify({ master: 7, muted: 'yes' }) })).toEqual(DEFAULT_PREFS);
    expect(loadPrefs({ getItem: () => { throw new Error('blocked'); } })).toEqual(DEFAULT_PREFS);
  });

  it('never machine-guns the same sound', () => {
    const { e, clock } = engine();
    e.unlock();
    e.worldRunning = true;
    for (let i = 0; i < 10; i++) { e.play('coin'); clock.t += 0.1; }
    expect(e.log.filter((s) => s === 'coin').length).toBeLessThanOrEqual(2);
  });

  it('the pause silences world sounds, not the interface', () => {
    const { e } = engine();
    e.unlock();
    e.world(0, false, 3, 1); // paused
    for (const s of ['type', 'bug', 'idea', 'coin'] as Sfx[]) e.play(s);
    e.world(0.5, false, 3, 1);
    expect(e.log).toEqual([]);
    e.play('click');
    e.play('decision');
    expect(e.log).toEqual(['click', 'decision']);
  });

  it('keyboards follow the people typing, at a calm rate', () => {
    const { e, clock } = engine();
    e.unlock();
    for (let i = 0; i < 600; i++) { clock.t += 1 / 60; e.world(1 / 60, true, 4, 8); }
    const keys = e.log.filter((s) => s === 'type').length;
    expect(keys).toBeGreaterThan(20); // 10 s with 4 people typing: audible
    expect(keys).toBeLessThanOrEqual(150); // never more than ~14 per second
    const before = e.log.length;
    for (let i = 0; i < 600; i++) { clock.t += 1 / 60; e.world(1 / 60, true, 0, 1); }
    expect(e.log.length).toBe(before); // nobody typing: no keyboards
  });

  it('a little variation: the same sound is never exactly the same twice', () => {
    const a = recipe('confirm', 0.1).notes[0]!.f, b = recipe('confirm', 0.7).notes[0]!.f;
    expect(a).not.toBe(b);
    expect(Math.abs(a - b) / a).toBeLessThan(0.06);
  });

  it('every sound has a short, soft recipe', () => {
    for (const s of ['click', 'open', 'close', 'confirm', 'error', 'buy', 'place', 'unlock', 'release', 'celebrate', 'notify', 'decision', 'coin', 'bug', 'idea', 'fixed', 'type'] as Sfx[]) {
      const r = recipe(s, 0.5);
      expect(r.notes.length + (r.noise?.length ?? 0), s).toBeGreaterThan(0);
      for (const n of r.notes) { expect(n.at + n.len, s).toBeLessThan(1.2); expect(n.gain ?? 0.2, s).toBeLessThanOrEqual(0.3); }
    }
  });
});
