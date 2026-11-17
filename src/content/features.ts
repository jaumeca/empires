/**
 * Game features (AW.D.1, builds on F3.2). Data only: the simulation reads it in
 * systems/features.ts. Words, not numbers, are shown to the player.
 *  - work: extra work as a share of the base size.
 *  - complexity: extra bug rate.
 *  - risk: chance it turns out harder than planned (hidden until found or prototyped).
 *  - appeal: quality ceiling it can add, scaled by how well it fits the topic.
 *  - reach: extra sales (more players can play it), not tied to the topic.
 *  - fit: per topic, -1 (out of place) .. 1 (what players of that topic love).
 */
export interface FeatureDef {
  id: string;
  work: number;
  complexity: number;
  risk: number;
  appeal: number;
  reach: number;
  minSize?: 'medium';
  fit: Record<string, number>;
  unlock?: { released?: number; reputation?: number; tech?: number };
}

export const FEATURES: readonly FeatureDef[] = [
  { id: 'story', work: 0.15, complexity: 0.03, risk: 0.1, appeal: 0.95, reach: 0, fit: { pirates: 1, 'space-farm': 0.5, robots: 0.3, cooking: -0.5, kart: -1 } },
  { id: 'customization', work: 0.1, complexity: 0.06, risk: 0.1, appeal: 0.6, reach: 0.05, fit: { kart: 1, cooking: 0.6, 'space-farm': 0.5, robots: 0.5, 'cat-puzzle': -0.3 } },
  { id: 'multiplayer', work: 0.3, complexity: 0.22, risk: 0.35, appeal: 0.5, reach: 0.35, fit: { kart: 1, robots: 0.6, cooking: 0.5, 'cat-puzzle': -0.5 }, unlock: { released: 1 } },
  { id: 'smart_ai', work: 0.22, complexity: 0.15, risk: 0.3, appeal: 0.85, reach: 0, fit: { robots: 1, pirates: 0.5, 'cat-puzzle': 0.5, kart: 0.3, cooking: -0.3 }, unlock: { tech: 6 } },
  { id: 'level_editor', work: 0.2, complexity: 0.1, risk: 0.2, appeal: 0.5, reach: 0.15, fit: { 'cat-puzzle': 1, kart: 0.6, robots: 0.3, pirates: -0.3 }, unlock: { released: 2 } },
  { id: 'open_world', work: 0.35, complexity: 0.2, risk: 0.35, appeal: 1.2, reach: 0.05, minSize: 'medium', fit: { pirates: 1, 'space-farm': 0.6, robots: 0.2, 'cat-puzzle': -1, cooking: -0.6 }, unlock: { released: 3 } },
  { id: 'cross_platform', work: 0.15, complexity: 0.12, risk: 0.25, appeal: 0, reach: 0.35, fit: {}, unlock: { reputation: 45 } },
];

export const FEATURE_SLOTS: Record<string, number> = { small: 2, medium: 3 };

export function getFeature(id: string): FeatureDef | undefined {
  return FEATURES.find((f) => f.id === id);
}
