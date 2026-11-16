import { SIM_CONFIG, type Pace } from './config';
import type { EventSink } from './core/events';
import { newId, record } from './core/ledger';
import type { Appearance, GameState, Project, ProjectSize, Rot } from './model/state';
import { canPlace, getItemDef, SELL_REFUND } from './systems/office';
import { useSavedIdeas } from './systems/events';
import { fire, hire } from './systems/team';
import { acceptContract, cancelContract } from './systems/contracts';
import { getActiveProject, getFounder } from './state';
import { getTopic } from '../content/topics';
import { resolveDecision } from './systems/decisions';
import { productionProgress } from './systems/project';
import { releaseProject } from './systems/market';

/** All player intents. The presentation layer never mutates GameState directly. */
export type Command =
  | { type: 'setup_founder'; name: string; companyName: string; appearance: Appearance }
  | {
      type: 'start_project';
      name: string;
      topicId: string;
      size: ProjectSize;
      focus: number;
      budget: number;
      days: number;
      price: number;
    }
  | { type: 'adjust_project'; budget?: number; deadlineDay?: number; pace?: Pace; testFocus?: number; price?: number }
  | { type: 'choose_option'; decisionId: string; optionId: string }
  | { type: 'release' }
  | { type: 'buy_item'; defId: string; x: number; z: number; rot: Rot }
  | { type: 'mount_item'; defId: string; deskUid: string }
  | { type: 'move_item'; uid: string; x: number; z: number; rot: Rot }
  | { type: 'sell_item'; uid: string }
  | { type: 'mark_news_read' }
  | { type: 'accept_contract'; offerId: string }
  | { type: 'cancel_contract' }
  | { type: 'hire'; candidateId: string }
  | { type: 'fire'; empirianId: string };

/** `error` is a stable code; the UI translates it as `error.<code>`. */
export type CommandResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): CommandResult => ({ ok: false, error });

export const PROJECT_LIMITS = {
  minDays: 14,
  maxDays: 120,
  prices: [4.99, 9.99, 14.99, 19.99],
} as const;

export function applyCommand(state: GameState, cmd: Command, emit: EventSink): CommandResult {
  switch (cmd.type) {
    case 'setup_founder': {
      const f = getFounder(state);
      const name = cmd.name.trim().slice(0, 24);
      if (!name) return fail('name_required');
      f.name = name;
      f.appearance = { ...cmd.appearance };
      state.company.name = cmd.companyName.trim().slice(0, 32) || `${name} Studio`;
      state.setupComplete = true;
      return { ok: true };
    }

    case 'start_project': {
      if (getActiveProject(state)) return fail('project_in_progress');
      if (state.contracts.active) return fail('contract_in_progress');
      try {
        getTopic(cmd.topicId);
      } catch {
        return fail('unknown_topic');
      }
      if (cmd.days < PROJECT_LIMITS.minDays || cmd.days > PROJECT_LIMITS.maxDays) return fail('invalid_duration');
      if (cmd.budget < 0 || cmd.budget > Math.max(0, state.company.money)) return fail('budget_exceeds_money');
      if (cmd.price <= 0) return fail('invalid_price');
      const required = SIM_CONFIG.work.requiredPoints[cmd.size];
      if (!required) return fail('invalid_size');
      const p: Project = {
        id: newId(state, 'P'),
        name: cmd.name.trim().slice(0, 32), // '' = untitled (UI shows project.unnamed)
        topicId: cmd.topicId,
        size: cmd.size,
        focus: Math.max(0, Math.min(1, cmd.focus)),
        pace: 'normal',
        phase: 'concept',
        startDay: state.day,
        deadlineDay: state.day + Math.round(cmd.days),
        originalDeadlineDay: state.day + Math.round(cmd.days),
        budget: cmd.budget,
        spent: 0,
        price: cmd.price,
        requiredPoints: required,
        workDone: { design: 0, tech: 0 },
        polishDone: 0,
        testingDone: 0,
        ceilingMods: [],
        bugRateMods: [],
        bugs: { hidden: 0, known: 0, fixed: 0 },
        hype: 1,
        testFocus: 0.6,
        decisionsTaken: [],
        bigIdeaOffered: false,
      };
      state.projects.push(p);
      state.activeProjectId = p.id;
      useSavedIdeas(state, p);
      record(state, {
        kind: 'project_started',
        text: { key: 'ledger.project_started', params: { project: p.name, topic: p.topicId, size: p.size, budget: cmd.budget, days: cmd.days } },
        causes: [],
        tone: 0,
        projectId: p.id,
      });
      emit({ type: 'project_started', projectId: p.id, severity: 'important' });
      return { ok: true };
    }

    case 'adjust_project': {
      const p = getActiveProject(state);
      if (!p || p.phase === 'released') return fail('no_active_project');
      if (cmd.budget !== undefined && cmd.budget !== p.budget) {
        if (cmd.budget < p.spent) return fail('budget_below_spent');
        if (cmd.budget - p.spent > Math.max(0, state.company.money)) return fail('not_enough_money');
        record(state, { kind: 'budget_changed', text: { key: 'ledger.budget_changed', params: { from: Math.round(p.budget), to: Math.round(cmd.budget) } }, causes: [], tone: 0, projectId: p.id });
        p.budget = cmd.budget;
      }
      if (cmd.deadlineDay !== undefined && cmd.deadlineDay !== p.deadlineDay) {
        if (cmd.deadlineDay <= state.day) return fail('deadline_past');
        if (cmd.deadlineDay - p.startDay > PROJECT_LIMITS.maxDays * 1.5) return fail('deadline_too_far');
        const later = cmd.deadlineDay > p.deadlineDay;
        record(state, {
          kind: 'deadline_changed',
          text: { key: later ? 'ledger.deadline_later' : 'ledger.deadline_earlier', params: { day: cmd.deadlineDay } },
          causes: [],
          tone: later ? 0 : -1,
          projectId: p.id,
        });
        p.deadlineDay = cmd.deadlineDay;
      }
      if (cmd.pace !== undefined && cmd.pace !== p.pace) {
        record(state, { kind: 'pace_changed', text: { key: `ledger.pace.${cmd.pace}` }, causes: [], tone: cmd.pace === 'crunch' ? -1 : 0, projectId: p.id });
        p.pace = cmd.pace;
      }
      if (cmd.testFocus !== undefined && cmd.testFocus !== p.testFocus) {
        const tf = Math.max(0, Math.min(1, cmd.testFocus));
        record(state, { kind: 'testing_changed', text: { key: tf < p.testFocus ? 'ledger.testing_less' : 'ledger.testing_more' }, causes: [], tone: tf < 0.3 ? -1 : 0, projectId: p.id });
        p.testFocus = tf;
      }
      if (cmd.price !== undefined) {
        if (cmd.price <= 0) return fail('invalid_price');
        p.price = cmd.price;
      }
      return { ok: true };
    }

    case 'choose_option': {
      return resolveDecision(state, cmd.decisionId, cmd.optionId, emit);
    }

    case 'buy_item': {
      let def;
      try { def = getItemDef(cmd.defId); } catch { return fail('unknown_item'); }
      if (def.locked) return fail('item_locked');
      if (def.layer === 'mount') return fail('not_placeable');
      if (state.company.money < def.price) return fail('not_enough_money');
      const err = canPlace(state.office, def.id, cmd.x, cmd.z, cmd.rot);
      if (err) return fail(`place_${err}`);
      if (!def.rotatable && cmd.rot !== 0) return fail('place_not_rotatable');
      const uid = newId(state, 'I');
      state.office.items.push({ uid, defId: def.id, x: cmd.x, z: cmd.z, rot: cmd.rot, ...(def.category === 'desk' ? { mounts: { computer: 'pc_basic', chair: 'chair_basic' } } : {}) });
      // A new desk comes with the basic computer and chair (their price is included).
      state.company.money -= def.price + (def.category === 'desk' ? getItemDef('pc_basic').price + getItemDef('chair_basic').price : 0);
      record(state, { kind: 'office', text: { key: 'ledger.office.bought', params: { item: def.id, price: def.price } }, causes: [], tone: 0 });
      emit({ type: 'office_changed', severity: 'info' });
      return { ok: true };
    }

    case 'mount_item': {
      let def;
      try { def = getItemDef(cmd.defId); } catch { return fail('unknown_item'); }
      if (def.layer !== 'mount') return fail('not_mountable');
      const desk = state.office.items.find((i) => i.uid === cmd.deskUid);
      if (!desk || getItemDef(desk.defId).category !== 'desk') return fail('no_desk');
      const slot = def.category === 'computer' ? 'computer' : 'chair';
      const old = desk.mounts?.[slot];
      if (old === def.id) return fail('already_mounted');
      if (state.company.money < def.price) return fail('not_enough_money');
      const refund = old ? Math.round(getItemDef(old).price * SELL_REFUND) : 0;
      desk.mounts = { ...desk.mounts, [slot]: def.id };
      state.company.money += refund - def.price;
      record(state, { kind: 'office', text: { key: 'ledger.office.mounted', params: { item: def.id, price: def.price, refund } }, causes: [], tone: 0 });
      emit({ type: 'office_changed', severity: 'info' });
      return { ok: true };
    }

    case 'move_item': {
      const it = state.office.items.find((i) => i.uid === cmd.uid);
      if (!it) return fail('unknown_item');
      const def = getItemDef(it.defId);
      if (!def.rotatable && cmd.rot !== 0) return fail('place_not_rotatable');
      const err = canPlace(state.office, def.id, cmd.x, cmd.z, cmd.rot, it.uid);
      if (err) return fail(`place_${err}`);
      it.x = cmd.x;
      it.z = cmd.z;
      it.rot = cmd.rot;
      emit({ type: 'office_changed', severity: 'info' });
      return { ok: true };
    }

    case 'sell_item': {
      const idx = state.office.items.findIndex((i) => i.uid === cmd.uid);
      const it = state.office.items[idx];
      if (!it) return fail('unknown_item');
      if (it.assignedTo) return fail('desk_in_use');
      const def = getItemDef(it.defId);
      const same = (pred: (d: ReturnType<typeof getItemDef>) => boolean) => state.office.items.filter((i) => pred(getItemDef(i.defId))).length;
      if (def.category === 'desk' && same((d) => d.category === 'desk') <= 1) return fail('last_desk');
      if (def.showcase && same((d) => !!d.showcase) <= 1) return fail('last_showcase');
      let refund = Math.round(def.price * SELL_REFUND);
      for (const m of [it.mounts?.computer, it.mounts?.chair]) if (m) refund += Math.round(getItemDef(m).price * SELL_REFUND);
      state.office.items.splice(idx, 1);
      state.company.money += refund;
      record(state, { kind: 'office', text: { key: 'ledger.office.sold', params: { item: def.id, refund } }, causes: [], tone: 0 });
      emit({ type: 'office_changed', severity: 'info' });
      return { ok: true };
    }

    case 'accept_contract': {
      const err = acceptContract(state, cmd.offerId);
      return err ? fail(err) : { ok: true };
    }

    case 'hire': {
      if (!state.setupComplete) return fail('setup_required');
      const err = hire(state, cmd.candidateId, emit);
      return err ? fail(err) : { ok: true };
    }
    case 'fire': {
      const err = fire(state, cmd.empirianId, emit);
      return err ? fail(err) : { ok: true };
    }
    case 'cancel_contract': {
      const err = cancelContract(state);
      return err ? fail(err) : { ok: true };
    }

    case 'mark_news_read': {
      state.world.lastReadNewsId = state.world.news[0]?.id ?? null;
      return { ok: true };
    }

    case 'release': {
      const p = getActiveProject(state);
      if (!p || p.phase === 'released') return fail('no_active_project');
      if (state.pendingDecision) return fail('resolve_decision_first');
      if (productionProgress(p) < 1 && p.phase !== 'polish') {
        record(state, { kind: 'delay', text: { key: 'ledger.released_early' }, causes: [], tone: -1, projectId: p.id });
      }
      releaseProject(state, p, getFounder(state), emit);
      return { ok: true };
    }
  }
}
