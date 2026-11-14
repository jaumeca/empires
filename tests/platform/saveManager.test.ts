import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../src/platform/storage';
import { SaveManager } from '../../src/platform/saveManager';
import { autoplay } from '../../src/sim/autoplay';
import { createNewGame } from '../../src/sim/state';
import { serialize } from '../../src/sim/save/save';

const meta = { gameVersion: 'test', now: () => '2026-11-14T00:00:00Z' };
const s1 = createNewGame(1);
const s2 = autoplay({ seed: 2, weeksAfter: 1 }).state;
const s3 = autoplay({ seed: 3, weeksAfter: 1 }).state;

describe('SaveManager', () => {
  it('saves, rotates two backups and loads the newest', () => {
    const st = new MemoryStorage();
    const m = new SaveManager(st, meta);
    expect(m.save(s1)).toBe(true);
    expect(m.save(s2)).toBe(true);
    expect(m.save(s3)).toBe(true);
    expect(st.read('auto.bak1')).toContain('"seed":2');
    expect(st.read('auto.bak2')).toContain('"seed":1');
    const r = m.load();
    expect(r.state).toEqual(s3);
    expect(r.recovered).toBe(false);
  });

  it('a failed or truncated write never destroys the good save', () => {
    for (const fault of ['fail', 'truncate'] as const) {
      const st = new MemoryStorage();
      const m = new SaveManager(st, meta);
      m.save(s2);
      st.fault = fault;
      expect(m.save(s3)).toBe(false);
      st.fault = 'none';
      expect(m.load().state).toEqual(s2);
    }
  });

  it('recovers from a corrupted current save using the backup and quarantines the damaged file', () => {
    const st = new MemoryStorage();
    const m = new SaveManager(st, meta);
    m.save(s2);
    m.save(s3);
    st.m.set('auto', st.read('auto')!.replace('"money":', '"money":1'));
    const r = m.load();
    expect(r.state).toEqual(s2);
    expect(r.recovered).toBe(true);
    expect(r.problems[0]).toEqual({ slot: 'auto', code: 'corrupted' });
    expect(st.read('quarantine.auto')).toContain('"money":1');
  });

  it('never overwrites a save from a newer game version (kept in quarantine)', () => {
    const st = new MemoryStorage();
    const future = JSON.parse(serialize(s3, { gameVersion: 'x', savedAt: 'x' }));
    future.schemaVersion = 99;
    st.m.set('auto', JSON.stringify(future));
    const m = new SaveManager(st, meta);
    const r = m.load();
    expect(r.state).toBeNull();
    expect(r.problems[0]!.code).toBe('too_new');
    m.save(s1);
    expect(JSON.parse(st.read('quarantine.auto')!).schemaVersion).toBe(99);
  });

  it('reads the legacy single-backup slot (auto.bak) from earlier builds', () => {
    const st = new MemoryStorage();
    st.m.set('auto', 'garbage');
    st.m.set('auto.bak', serialize(s2, { gameVersion: 'old', savedAt: 'x' }));
    expect(new SaveManager(st, meta).load().state).toEqual(s2);
  });

  it('import validates first and keeps the replaced game as a backup', () => {
    const st = new MemoryStorage();
    const m = new SaveManager(st, meta);
    m.save(s2);
    expect(() => m.importText('{"format":"nope"}')).toThrow(/not_empires/);
    expect(m.load().state).toEqual(s2);
    m.importText(serialize(s3, { gameVersion: 'x', savedAt: 'x' }));
    expect(m.load().state).toEqual(s3);
    expect(st.read('auto.bak1')).toContain('"seed":2');
  });

  it('starting over keeps the previous game in a backup', () => {
    const st = new MemoryStorage();
    const m = new SaveManager(st, meta);
    m.save(s2);
    m.startOver();
    expect(st.read('auto')).toBeNull();
    expect(st.read('auto.bak1')).toContain('"seed":2');
  });
});
