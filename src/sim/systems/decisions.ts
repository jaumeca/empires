import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import type { Empirian, GameState, PendingDecision, Project } from '../model/state';
import { productionProgress } from './project';
import { releaseProject } from './market';

/**
 * Decisive Moments for the MVP. They are triggered by real simulation state
 * (progress, deadline) and every option has concrete, recorded consequences.
 */

export function maybeOfferBigIdea(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (p.bigIdeaOffered || p.phase !== 'production' || state.pendingDecision) return;
  if (productionProgress(p) < 0.45) return;
  p.bigIdeaOffered = true;
  const extraDays = p.size === 'small' ? 10 : 14;
  const decision: PendingDecision = {
    id: newId(state, 'D'),
    kind: 'big_idea',
    speakerId: founder.id,
    text: `¡Jefe! Se me ha ocurrido una mecánica genial para "${p.name}". Si le dedicamos ${extraDays} días más, el juego podría mejorar muchísimo.`,
    options: [
      { id: 'approve', label: `¡Adelante! (+${extraDays} días)`, hints: ['Calidad ↑↑ (probable)', 'Coste ↑ y retraso', 'Interés del público ↓ si te retrasas'] },
      { id: 'simple', label: 'Haz una versión sencilla', hints: ['Calidad ↑ (algo)', `+${Math.round(extraDays / 3)} días`, 'Bugs ↑ (prisas)'] },
      { id: 'postpone', label: 'Para una actualización', hints: ['Sin retraso', 'Queda como promesa a los jugadores', 'Ánimo ↑ un poco'] },
      { id: 'keep', label: 'Mantener el plan', hints: ['Sin cambios', 'Ánimo ↓'] },
    ],
    createdTick: state.tick,
  };
  state.pendingDecision = decision;
  founder.activity = 'raising_hand';
  emit({ type: 'idea', empirianId: founder.id, severity: 'info' });
  emit({ type: 'decision_requested', decisionId: decision.id, severity: 'decisive' });
}

export function maybeDeadlineDecision(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (state.pendingDecision || p.phase === 'released' || state.day < p.deadlineDay) return;
  const prog = productionProgress(p);
  const unfinished = prog < 1;
  const decision: PendingDecision = {
    id: newId(state, 'D'),
    kind: 'deadline',
    speakerId: founder.id,
    text: unfinished
      ? `Jefe, hoy es la fecha de lanzamiento de "${p.name}"… y solo tenemos el ${Math.round(prog * 100)} % del contenido.`
      : `¡Jefe, hoy es el día! "${p.name}" está listo para publicarse. Bugs conocidos: ${p.bugs.known}.`,
    options: [
      { id: 'release', label: '¡Publicar ya!', hints: unfinished ? ['Contenido incompleto: críticas ↓↓', 'Sin más costes'] : ['Bugs ocultos pueden llegar al público'] },
      { id: 'extend7', label: 'Una semana más', hints: ['Más pulido / contenido', 'Coste ↑', 'Interés ↓ (retraso)'] },
      { id: 'extend14', label: 'Dos semanas más', hints: ['Mucho más pulido', 'Coste ↑↑', 'Interés ↓↓ (retraso)'] },
    ],
    createdTick: state.tick,
  };
  state.pendingDecision = decision;
  founder.activity = 'raising_hand';
  emit({ type: 'decision_requested', decisionId: decision.id, severity: 'decisive' });
}

export function resolveDecision(
  state: GameState,
  decisionId: string,
  optionId: string,
  emit: EventSink,
): { ok: true } | { ok: false; error: string } {
  const d = state.pendingDecision;
  if (!d || d.id !== decisionId) return { ok: false, error: 'No such pending decision' };
  if (!d.options.some((o) => o.id === optionId)) return { ok: false, error: 'Invalid option' };
  const p = state.projects.find((x) => x.id === state.activeProjectId);
  const founder = state.empirians.find((e) => e.id === d.speakerId);
  if (!p || !founder) return { ok: false, error: 'Project missing' };

  state.pendingDecision = null;
  founder.activity = 'idle';
  p.decisionsTaken.push(`${d.kind}:${optionId}`);

  if (d.kind === 'big_idea') {
    const extraDays = p.size === 'small' ? 10 : 14;
    if (optionId === 'approve') {
      const id = record(state, { kind: 'decision', text: `Aprobaste la gran idea: ${extraDays} días más y más trabajo, a cambio de un techo de calidad mayor.`, causes: [], tone: 1, projectId: p.id });
      p.requiredPoints *= 1.25;
      p.deadlineDay += extraDays;
      p.ceilingMods.push({ amount: 1.0, causeId: id });
      founder.morale = Math.min(100, founder.morale + 8);
    } else if (optionId === 'simple') {
      const id = record(state, { kind: 'decision', text: 'Pediste una versión sencilla de la gran idea: algo más de calidad, hecha con prisas.', causes: [], tone: 0, projectId: p.id });
      p.requiredPoints *= 1.07;
      p.deadlineDay += Math.round(extraDays / 3);
      p.ceilingMods.push({ amount: 0.5, causeId: id });
      p.bugRateMods.push({ factor: 1.3, causeId: id });
    } else if (optionId === 'postpone') {
      record(state, { kind: 'promise', text: 'Prometiste la gran idea para una actualización futura.', causes: [], tone: 0, projectId: p.id });
      founder.morale = Math.min(100, founder.morale + 3);
    } else {
      record(state, { kind: 'decision', text: 'Rechazaste la gran idea y mantuviste el plan. El equipo se desanimó un poco.', causes: [], tone: -1, projectId: p.id });
      founder.morale = Math.max(0, founder.morale - 10);
    }
  } else if (d.kind === 'deadline') {
    if (optionId === 'release') {
      emit({ type: 'decision_resolved', decisionId, optionId, severity: 'info' });
      releaseProject(state, p, founder, emit);
      return { ok: true };
    }
    const days = optionId === 'extend7' ? 7 : 14;
    record(state, { kind: 'delay', text: `Retrasaste el lanzamiento ${days} días respecto a lo anunciado.`, causes: [], tone: -1, projectId: p.id });
    p.deadlineDay = state.day + days;
  }
  emit({ type: 'decision_resolved', decisionId, optionId, severity: 'info' });
  return { ok: true };
}
