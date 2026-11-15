import type { TextRef } from '../sim/model/state';
import { es } from './es';
import { en } from './en';

/**
 * Minimal internationalization. The simulation never contains player-facing
 * text: it stores TextRefs ({ key, params }) and the UI translates them here.
 *
 * Placeholders: {name} plain · {name:money} · {name:int} · {name:num1} (1 decimal)
 * · {name:pct} (0.42 → 42) · {name:price} · {name:topic} (topic id → name) · {name:size} · {name:skill}
 * Plurals: if a `count` param exists and `<key>_one` / `<key>_other` exist, they are used.
 */
export type Catalog = Record<string, string>;
export type Locale = 'es' | 'en';

export const CATALOGS: Record<Locale, Catalog> = { es, en };
export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', en: 'English (borrador)' };
const INTL: Record<Locale, string> = { es: 'es-ES', en: 'en-US' };

let locale: Locale = 'es';

export function setLocale(l: Locale): void {
  locale = l;
}
export function getLocale(): Locale {
  return locale;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString(INTL[locale]);
}
export function fmtMoney(n: number): string {
  const v = Math.round(Math.abs(n)).toLocaleString(INTL[locale]);
  const sign = n < 0 ? '-' : '';
  return locale === 'en' ? `${sign}€${v}` : `${sign}${v} €`;
}
export function fmtPrice(n: number): string {
  const v = n.toLocaleString(INTL[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return locale === 'en' ? `€${v}` : `${v} €`;
}
export function fmtNum1(n: number): string {
  return n.toLocaleString(INTL[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function lookup(key: string): string | undefined {
  return CATALOGS[locale][key] ?? CATALOGS.es[key];
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  let template: string | undefined;
  if (typeof params.count === 'number') {
    const rule = new Intl.PluralRules(INTL[locale]).select(params.count);
    template = lookup(`${key}_${rule}`) ?? lookup(`${key}_other`);
  }
  template ??= lookup(key);
  if (template === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key ${key}`);
    return key;
  }
  return template.replace(/\{(\w+)(?::(\w+))?\}/g, (_m, name: string, fmt?: string) => {
    const v = params[name];
    if (v === undefined) return `{${name}}`;
    switch (fmt) {
      case 'money': return fmtMoney(Number(v));
      case 'int': return fmtInt(Number(v));
      case 'num1': return fmtNum1(Number(v));
      case 'pct': return fmtInt(Number(v) * 100);
      case 'price': return fmtPrice(Number(v));
      case 'topic': return t(`topic.${v}.name`);
      case 'size': return t(`size.${v}`);
      case 'skill': return t(`skill.${v}`);
      case 'item': return t(`item.${v}.name`);
      case 'company': return t(`company.${v}`);
      default: return String(v);
    }
  });
}

export function tr(ref: TextRef | undefined): string {
  return ref ? t(ref.key, ref.params) : '';
}
