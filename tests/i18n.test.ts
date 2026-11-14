import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { es } from '../src/i18n/es';
import { en } from '../src/i18n/en';
import { setLocale, t, tr } from '../src/i18n/i18n';
import { autoplay } from '../src/sim/autoplay';
import { TOPICS } from '../src/content/topics';
import { OUTLETS } from '../src/sim/systems/market';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)(?::\w+)?\}/g)].map((m) => m[1]).sort();

describe('i18n catalogs', () => {
  it('es and en have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
  it('translations use the same placeholders', () => {
    for (const k of Object.keys(es)) expect(placeholders(en[k] ?? ''), k).toEqual(placeholders(es[k]!));
  });
  it('every literal key used in the code exists', () => {
    const used = new Set<string>();
    for (const f of [...files('src/sim'), ...files('src/ui'), ...files('src/app')]) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:\bt\(|key: )'([a-z0-9_.-]+)'/g)) used.add(m[1]!);
    }
    const missing = [...used].filter((k) => !(k in es) && !(`${k}_other` in es));
    expect(missing).toEqual([]);
  });
  it('dynamic keys exist: topics, outlets, phases, appearance, activities, error codes', () => {
    const keys = [
      ...TOPICS.flatMap((x) => [`topic.${x.id}.name`, `topic.${x.id}.blurb`]),
      ...OUTLETS.map((o) => `outlet.${o}`),
      ...['concept', 'production', 'polish', 'released'].map((p) => `phase.${p}`),
      ...Array.from({ length: 8 }, (_, i) => `hair.${i}`), ...Array.from({ length: 5 }, (_, i) => `top.${i}`), ...Array.from({ length: 6 }, (_, i) => `acc.${i}`),
      ...['idle', 'coding', 'designing', 'testing', 'thinking', 'raising_hand', 'celebrating', 'resting'].map((a) => `emp.activity.${a}`),
      ...['relaxed', 'normal', 'crunch'].map((p) => `ledger.pace.${p}`),
    ];
    const src = readFileSync('src/sim/commands.ts', 'utf8') + readFileSync('src/sim/systems/decisions.ts', 'utf8');
    for (const m of src.matchAll(/error: '([a-z_]+)'|fail\('([a-z_]+)'\)/g)) keys.push(`error.${m[1] ?? m[2]}`);
    const save = readFileSync('src/sim/save/save.ts', 'utf8');
    for (const m of save.matchAll(/new SaveError\('([a-z_]+)'/g)) keys.push(`save.error.${m[1]}`);
    expect(keys.filter((k) => !(k in es))).toEqual([]);
  });
  it('the simulation contains no player-facing Spanish text', () => {
    for (const f of files('src/sim').filter((x) => !x.endsWith('migrations.ts'))) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/[áéíóúñ¿¡]/);
    }
  });
  it('every text produced by a full game renders in both languages without missing keys', () => {
    const { state } = autoplay({ seed: 4, bigIdea: 'approve', atDeadline: 'extend7', pace: 'crunch' });
    const refs = [...state.ledger.map((e) => e.text), ...state.projects.flatMap((p) => p.result?.reviews.map((r) => r.quote) ?? [])];
    for (const loc of ['es', 'en'] as const) {
      setLocale(loc);
      for (const r of refs) {
        const s = tr(r);
        expect(s, r.key).not.toBe(r.key);
        expect(s, r.key).not.toMatch(/\{\w+/);
      }
    }
    setLocale('es');
  });
  it('formats numbers, money and plurals per locale', () => {
    setLocale('es');
    expect(t('toast.shelf', { count: 1 })).toContain('1 juego publicado');
    expect(t('toast.shelf', { count: 3 })).toContain('3 juegos');
    expect(t('np.budget_value', { budget: 1500, marketing: 450 })).toBe('1500 € · 450 € en marketing');
    setLocale('en');
    expect(t('np.budget_value', { budget: 1500, marketing: 450 })).toBe('€1,500 · €450 on marketing');
    expect(t('pp.content', { pct: 0.42 })).toBe('Content 42%');
    setLocale('es');
  });
});
