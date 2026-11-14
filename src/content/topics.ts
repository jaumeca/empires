/**
 * Fictional, contemporary game topics (D-021). Pure data, safe to import from sim/.
 * Texts live in src/i18n.
 * `idealFocus`: 0 = all design, 1 = all tech. `interest`: base market interest (0-1).
 */
export interface TopicDef {
  id: string;
  /** Name and blurb are translated via i18n keys `topic.<id>.name` / `.blurb`. */
  interest: number;
  idealFocus: number;
}

export const TOPICS: readonly TopicDef[] = [
  { id: 'space-farm', interest: 0.7, idealFocus: 0.35 },
  { id: 'kart', interest: 0.75, idealFocus: 0.7 },
  { id: 'cat-puzzle', interest: 0.6, idealFocus: 0.25 },
  { id: 'pirates', interest: 0.65, idealFocus: 0.45 },
  { id: 'cooking', interest: 0.55, idealFocus: 0.4 },
  { id: 'robots', interest: 0.6, idealFocus: 0.75 },
];

export function getTopic(id: string): TopicDef {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown topic ${id}`);
  return t;
}
