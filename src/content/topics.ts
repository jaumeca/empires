/**
 * Fictional, contemporary game topics (D-021). Pure data, safe to import from sim/.
 * `idealFocus`: 0 = all design, 1 = all tech. `interest`: base market interest (0-1).
 */
export interface TopicDef {
  id: string;
  name: string;
  icon: string; // short glyph used by UI cards
  interest: number;
  idealFocus: number;
  blurb: string;
}

export const TOPICS: readonly TopicDef[] = [
  { id: 'space-farm', name: 'Granja espacial', icon: '🪐', interest: 0.7, idealFocus: 0.35, blurb: 'Cultivar zanahorias en asteroides. Relajante y adictivo.' },
  { id: 'kart', name: 'Carreras de karts', icon: '🏁', interest: 0.75, idealFocus: 0.7, blurb: 'Velocidad, derrapes y mucha física.' },
  { id: 'cat-puzzle', name: 'Puzles de gatos', icon: '🐈', interest: 0.6, idealFocus: 0.25, blurb: 'Gatos, cajas y lógica. Encanto puro.' },
  { id: 'pirates', name: 'Aventura pirata', icon: '🏴', interest: 0.65, idealFocus: 0.45, blurb: 'Islas, mapas y tesoros escondidos.' },
  { id: 'cooking', name: 'Cocina caótica', icon: '🍳', interest: 0.55, idealFocus: 0.4, blurb: 'Pedidos imposibles y sartenes en llamas.' },
  { id: 'robots', name: 'Estrategia de robots', icon: '🤖', interest: 0.6, idealFocus: 0.75, blurb: 'Ejércitos de robots y simulación táctica.' },
];

export function getTopic(id: string): TopicDef {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown topic ${id}`);
  return t;
}
