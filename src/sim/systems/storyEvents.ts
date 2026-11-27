import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import { pick } from '../core/rng';
import type { DecisionOption, Empirian, GameState, Project, SkillId, TextRef } from '../model/state';
import { getActiveProject, getFounder } from '../state';
import { productionProgress } from './project';
import { gainXp } from './progression';
import { remember } from './story';
import { employees } from './team';
import type { EventDef } from './events';
import { bond, changeBond } from './relations';
import { officeEffects } from './office';
import { demandFactor } from './world';
import { startSupport, updateBlock } from './products';
import { suggestIdea } from './inspiration';

/** How much the office-or-project choice costs: a share of the cash, clamped. */
function investCost(s: GameState): number {
  return Math.round(Math.max(K().investMin, Math.min(K().investMax, s.company.money * K().investShare)) / 100) * 100;
}
/** Money into a game's marketing (same formula as the project's own budget). */
function addHype(p: Project, money: number): void {
  const C = SIM_CONFIG;
  p.hype += (money * C.work.marketingShare * C.market.hypePerMarketingMoney) / (1 + p.hype / C.market.hypeSaturation);
}

/**
 * Story events (AW.D events, "The Next Chapter"): the studio's people and the
 * outside world ask for decisions. Each one depends on the real state, has
 * options with different, measurable consequences, a cooldown, and leaves a
 * memory in the Story (with the people involved).
 * Numbers live in SIM_CONFIG.storyEvents.
 */
const K = () => SIM_CONFIG.storyEvents;
const k = (key: string, params?: TextRef['params']): TextRef => (params ? { key, params } : { key });
const opt = (kind: string, id: string, hints: string[]): DecisionOption => ({ id, label: k(`event.${kind}.${id}`), hints: hints.map((h) => k(h)) });
const proj = (s: GameState, id: string | number | undefined) => s.projects.find((p) => p.id === id);
const person = (s: GameState, id: string | number | undefined) => s.empirians.find((e) => e.id === id);
const morale = (e: Empirian | undefined, d: number) => { if (e) e.morale = Math.max(0, Math.min(100, e.morale + d)); };
const seen = (p: Project, kind: string) => (p.storyEvents ?? []).includes(kind);
const mark = (p: Project, kind: string) => { p.storyEvents = [...(p.storyEvents ?? []), kind]; };
/** One working day of the whole team, in work points (for "lose N days"). */
const teamDay = () => SIM_CONFIG.ticksPerDay * 0.9;

/** The ledger entry and a Story memory that names the people involved. */
function story(s: GameState, kind: string, o: string, params: TextRef['params'], tone: -1 | 0 | 1, people: string[], projectId?: string): string {
  const text = k(`ledger.event.${kind}.${o}`, params);
  const id = record(s, { kind: 'decision', text, causes: [], tone, projectId });
  remember(s, `event:${id}`, 'decision', text, { tone, empirianIds: people.length ? people : undefined, projectId });
  return id;
}

/** The skill someone works on most (what they would like to train). */
function mainSkill(e: Empirian): SkillId {
  return e.skills.tech >= e.skills.design ? 'tech' : 'design';
}

export const STORY_EVENTS: EventDef[] = [
  {
    // An employee has an idea for the current game.
    kind: 'team_idea',
    cooldownDays: 45,
    chance: 0.06,
    trigger: (s) => {
      const p = getActiveProject(s);
      const staff = employees(s);
      if (!p || !staff.length || seen(p, 'team_idea') || (p.phase !== 'concept' && p.phase !== 'production') || productionProgress(p) > 0.6) return null;
      const keen = staff.filter((e) => e.trait === 'curious' || e.skills.creativity >= 5);
      return { projectId: p.id, empirianId: pick(s.rng.events, keen.length ? keen : staff).id };
    },
    build: (s, c) => ({
      speakerId: String(c.empirianId),
      text: k('event.team_idea.text', { name: person(s, c.empirianId)!.name, project: proj(s, c.projectId)!.name }),
      options: [
        opt('team_idea', 'adopt', ['hint.quality_up_some', 'hint.work_up_small', 'hint.morale_up_them']),
        opt('team_idea', 'save', ['hint.next_project_better']),
        opt('team_idea', 'decline', ['hint.no_changes', 'hint.morale_down_them']),
      ],
    }),
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      const e = person(s, c.empirianId);
      mark(p, 'team_idea');
      const name = e?.name ?? '';
      const id = story(s, 'team_idea', o, { name, project: p.name }, o === 'decline' ? 0 : 1, e ? [e.id] : [], p.id);
      if (o === 'adopt') {
        p.requiredPoints *= 1 + K().ideaWork;
        // Better ideas from more creative people.
        const bonus = Math.max(K().ideaBonus[0], Math.min(K().ideaBonus[1], 0.15 + 0.05 * ((e?.skills.creativity ?? 5) - 3)));
        p.ceilingMods.push({ amount: bonus, causeId: id });
        morale(e, K().moraleBig);
      } else if (o === 'save') {
        s.company.savedIdeas = [...(s.company.savedIdeas ?? []), id];
        morale(e, K().moraleSmall);
      } else {
        morale(e, -K().moraleBig + 2);
      }
    },
  },
  {
    // The client of the current contract wants more than agreed.
    kind: 'contract_change',
    cooldownDays: 60,
    chance: 0.08,
    trigger: (s) => {
      const a = s.contracts.active;
      if (!a || a.renegotiated || a.dueDay - s.day < 4) return null;
      const done = a.done / a.work;
      if (done < 0.25 || done > 0.75) return null;
      return { client: a.clientId, extraWork: Math.round(a.work * K().changeWork), extraPay: Math.round((a.payment * K().changePay) / 10) * 10 };
    },
    build: (_s, c) => ({
      text: k('event.contract_change.text', { client: c.client!, pay: Number(c.extraPay) }),
      options: [
        opt('contract_change', 'paid', ['hint.work_up', 'hint.more_pay', 'hint.more_days']),
        opt('contract_change', 'favour', ['hint.work_up_small', 'hint.reputation_up']),
        opt('contract_change', 'refuse', ['hint.no_changes', 'hint.reputation_down_small']),
      ],
    }),
    resolve: (s, c, o) => {
      const a = s.contracts.active;
      if (!a) return;
      a.renegotiated = true;
      story(s, 'contract_change', o, { client: c.client!, pay: Number(c.extraPay) }, o === 'refuse' ? 0 : 1, []);
      if (o === 'paid') {
        a.work += Number(c.extraWork);
        a.payment += Number(c.extraPay);
        a.dueDay += Math.ceil(a.days * K().changeDays);
      } else if (o === 'favour') {
        a.work += Math.round(Number(c.extraWork) * K().favourShare);
        s.company.reputation = Math.min(100, s.company.reputation + K().favourReputation);
      } else {
        s.company.reputation = Math.max(0, s.company.reputation - 1);
      }
    },
  },
  {
    // A game fair: show the game in progress to players and press.
    kind: 'game_fair',
    cooldownDays: 120,
    chance: 0.03,
    trigger: (s) => {
      const p = getActiveProject(s);
      if (!p || seen(p, 'game_fair') || (p.phase !== 'production' && p.phase !== 'polish') || p.deadlineDay - s.day < 10) return null;
      if (s.company.money < K().fairBooth + 1000) return null;
      return { projectId: p.id, city: pick(s.rng.events, ['PixelFest', 'Harbour Play', 'North Game Days']) };
    },
    build: (s, c) => ({
      text: k('event.game_fair.text', { project: proj(s, c.projectId)!.name, fair: String(c.city), booth: K().fairBooth, table: K().fairTable }),
      options: [
        opt('game_fair', 'booth', ['hint.interest_up2', 'hint.morale_up_team', 'hint.lose_2_days']),
        opt('game_fair', 'table', ['hint.interest_up']),
        opt('game_fair', 'skip', ['hint.no_changes']),
      ],
    }),
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      mark(p, 'game_fair');
      story(s, 'game_fair', o, { project: p.name, fair: String(c.city) }, o === 'skip' ? 0 : 1, o === 'booth' ? s.empirians.map((e) => e.id) : [], p.id);
      if (o === 'booth') {
        s.company.money -= K().fairBooth;
        p.hype += K().fairBoothHype;
        p.requiredPoints += 2 * teamDay();
        s.company.reputation = Math.min(100, s.company.reputation + 1);
        for (const e of s.empirians) morale(e, K().moraleBig - 2);
      } else if (o === 'table') {
        s.company.money -= K().fairTable;
        p.hype += K().fairTableHype;
      }
    },
  },
  {
    // An influential critic wants to cover a recent release: good games win, weak ones suffer.
    kind: 'influential_review',
    cooldownDays: 90,
    chance: 0.06,
    trigger: (s) => {
      const recent = s.projects.filter((p) => p.result && !p.result.salesEnded && !p.result.criticCovered && s.day - p.result.releasedDay >= 3 && s.day - p.result.releasedDay <= 35);
      if (!recent.length) return null;
      const p = pick(s.rng.events, recent);
      return { projectId: p.id, critic: pick(s.rng.events, ['Ada Pixel', 'Max Render', 'Lumi Play', 'Rex Score']) };
    },
    build: (s, c) => ({
      text: k('event.influential_review.text', { critic: String(c.critic), project: proj(s, c.projectId)!.name }),
      options: [
        opt('influential_review', 'send_copy', ['hint.sales_up_if_good', 'hint.risky_if_weak']),
        opt('influential_review', 'interview', ['hint.sales_up_some', getActiveProject(s) ? 'hint.lose_2_days' : 'hint.no_delay']),
        opt('influential_review', 'decline', ['hint.no_changes']),
      ],
    }),
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      const r = p.result!;
      r.criticCovered = true;
      const score = r.averageScore;
      const verdict = o !== 'send_copy' ? 'mixed' : score >= K().criticGood ? 'good' : score < K().criticBad ? 'bad' : 'mixed';
      const key = o === 'send_copy' ? `send_copy_${verdict}` : o;
      story(s, 'influential_review', key, { critic: String(c.critic), project: p.name }, verdict === 'bad' ? -1 : o === 'decline' ? 0 : 1, [], p.id);
      const boost = (factor: number, days: number) => {
        const prev = r.salesBoost && r.salesBoost.untilDay > s.day ? r.salesBoost.factor : 1;
        r.salesBoost = { factor: prev * factor, untilDay: s.day + days };
      };
      if (o === 'send_copy') {
        const [f, rep] = verdict === 'good' ? [K().criticGoodSales, 2] : verdict === 'bad' ? [K().criticBadSales, -2] : [1.05, 0];
        boost(f, 35);
        s.company.reputation = Math.max(0, Math.min(100, s.company.reputation + rep));
      } else if (o === 'interview') {
        boost(K().interviewSales, 28);
        const a = getActiveProject(s);
        if (a) a.requiredPoints += 2 * teamDay() * 0.5;
      }
    },
  },
  {
    // Two people disagree on how to build something.
    kind: 'team_debate',
    cooldownDays: 60,
    chance: 0.05,
    trigger: (s) => {
      const p = getActiveProject(s);
      const staff = employees(s);
      if (!p || !staff.length || p.phase !== 'production' || seen(p, 'team_debate')) return null;
      // Disagreements surface where relationships are weakest (E.3); ties are decided by the seed.
      const pairs = staff.flatMap((a) => s.empirians.filter((b) => b.id !== a.id).map((b) => [a, b] as const));
      const lowest = Math.min(...pairs.map(([a, b]) => bond(s, a.id, b.id)));
      const [x, y] = pick(s.rng.events, pairs.filter(([x, y]) => bond(s, x.id, y.id) === lowest));
      // Personality (0.20.0): a perfectionist is the one who wants to redo it properly; a night owl, to push on.
      const wantsClean = (e: Empirian) => (e.trait === 'perfectionist' ? 2 : 0) - (e.trait === 'night_owl' ? 1 : 0);
      const [a, b] = wantsClean(y) > wantsClean(x) ? [y, x] : [x, y];
      return { projectId: p.id, aId: a.id, bId: b.id };
    },
    build: (s, c) => {
      const a = person(s, c.aId)!;
      const b = person(s, c.bId)!;
      return {
        speakerId: a.id,
        text: k('event.team_debate.text', { a: a.name, b: b.name, project: proj(s, c.projectId)!.name }),
        options: [
          { ...opt('team_debate', 'clean', ['hint.bugs_down', 'hint.work_up_small']), label: k('event.team_debate.clean', { name: a.name }) },
          { ...opt('team_debate', 'fast', ['hint.work_down', 'hint.bugs_up']), label: k('event.team_debate.fast', { name: b.name }) },
          opt('team_debate', 'both', ['hint.work_up_small', 'hint.morale_same']),
        ],
      };
    },
    resolve: (s, c, o, emit: EventSink) => {
      const p = proj(s, c.projectId)!;
      const a = person(s, c.aId);
      const b = person(s, c.bId);
      mark(p, 'team_debate');
      const id = story(s, 'team_debate', o, { a: a?.name ?? '', b: b?.name ?? '', project: p.name }, 0, [a?.id, b?.id].filter((x): x is string => !!x), p.id);
      // Who loses the argument resents it a little; a compromise brings them closer (E.3).
      if (a && b) changeBond(s, a.id, b.id, o === 'both' ? SIM_CONFIG.relations.debateCompromise : -SIM_CONFIG.relations.debateLose, emit);
      if (o === 'clean') {
        p.requiredPoints *= 1 + K().debateWork;
        p.bugRateMods.push({ factor: K().debateCleanBugs, causeId: id });
        morale(a, K().moraleBig - 2); morale(b, -K().moraleSmall - 3);
      } else if (o === 'fast') {
        p.requiredPoints *= 1 - K().debateWork;
        p.bugRateMods.push({ factor: K().debateFastBugs, causeId: id });
        morale(b, K().moraleBig - 2); morale(a, -K().moraleSmall - 3);
      } else {
        p.requiredPoints *= 1 + K().debateWork / 2;
        morale(a, 1); morale(b, 1);
      }
    },
  },
  {
    // Someone asks for training.
    kind: 'training_request',
    cooldownDays: 75,
    chance: 0.05,
    trigger: (s) => {
      const keen = employees(s).filter((e) => s.day - (e.hiredDay ?? 0) >= 14 && e.skills[mainSkill(e)] < 7.5);
      if (!keen.length || s.company.money < K().courseCost + 1000) return null;
      const e = pick(s.rng.events, keen);
      return { empirianId: e.id, skill: mainSkill(e) };
    },
    build: (s, c) => ({
      speakerId: String(c.empirianId),
      text: k('event.training_request.text', { name: person(s, c.empirianId)!.name, skill: String(c.skill), cost: K().courseCost }),
      options: [
        opt('training_request', 'course', ['hint.skill_up', 'hint.morale_up_them', getActiveProject(s) ? 'hint.lose_1_day_them' : 'hint.no_delay']),
        opt('training_request', 'books', ['hint.skill_up_little']),
        opt('training_request', 'not_now', ['hint.no_changes', 'hint.morale_down_them']),
      ],
    }),
    resolve: (s, c, o, emit: EventSink) => {
      const e = person(s, c.empirianId);
      if (!e) return;
      const skill = String(c.skill) as SkillId;
      story(s, 'training_request', o, { name: e.name, skill }, o === 'not_now' ? -1 : 1, [e.id]);
      if (o === 'course') {
        s.company.money -= K().courseCost;
        gainXp(s, e, skill, K().courseXp, emit);
        morale(e, K().moraleBig - 2);
        const a = getActiveProject(s);
        if (a) a.requiredPoints += teamDay() / Math.max(1, s.empirians.length);
      } else if (o === 'books') {
        s.company.money -= K().booksCost;
        gainXp(s, e, skill, K().booksXp, emit);
        morale(e, 1);
      } else {
        morale(e, -K().moraleSmall - 3);
      }
    },
  },

  {
    // 0.21.0 (D-070): the founder wonders — make the office nicer for the team, or put the money into the games?
    kind: 'office_or_project',
    cooldownDays: 150,
    chance: 0.04,
    trigger: (s) => {
      const released = s.projects.filter((p) => p.result).length;
      if (released < 2 || s.company.money < 15000) return null;
      // Only when the office is still plain for the size of the team.
      const plain = officeEffects(s.office).ambiance < 5 + 1.5 * (s.empirians.length - 1); // the starting room is 3.7
      return plain && (s.office.renovated ?? 0) < 2 ? { cost: investCost(s) } : null;
    },
    build: (s, c) => ({
      text: k('event.office_or_project.text', { cost: Number(c.cost) }),
      options: [
        opt('office_or_project', 'office', ['hint.morale_up', 'hint.energy_up', 'hint.costs_money']),
        opt('office_or_project', 'project', [getActiveProject(s) ? 'hint.interest_up' : 'hint.interest_next', 'hint.costs_money']),
        opt('office_or_project', 'neither', ['hint.no_changes']),
      ],
    }),
    resolve: (s, c, o, emit: EventSink) => {
      const cost = Number(c.cost);
      story(s, 'office_or_project', o, { cost }, o === 'neither' ? 0 : 1, [getFounder(s).id]);
      if (o === 'office') {
        s.company.money -= cost;
        s.office.renovated = (s.office.renovated ?? 0) + 1; // lasting: the room itself is nicer
        for (const e of s.empirians) { morale(e, K().investMorale); e.energy = Math.min(SIM_CONFIG.energy.max, e.energy + K().investEnergy); }
      } else if (o === 'project') {
        s.company.money -= cost;
        const p = getActiveProject(s);
        if (p) addHype(p, cost);
        else s.company.launchFund = (s.company.launchFund ?? 0) + cost;
      }
      void emit;
    },
  },
  {
    // 0.21.0 (D-070): an old game of the studio is suddenly back in fashion (its topic is trending).
    kind: 'old_game_revival',
    cooldownDays: 120,
    chance: 0.06,
    trigger: (s) => {
      const old = s.projects.filter((p) => p.result && !p.result.revived && s.day - p.result.releasedDay >= K().revivalMinAge && p.result.averageScore >= 6.5 && (p.result.salesEnded || p.result.weeklySales.length >= SIM_CONFIG.market.salesWeeks) && demandFactor(s, p.topicId) >= 1.08);
      if (!old.length) return null;
      const p = old.sort((a, b) => b.result!.averageScore - a.result!.averageScore)[0]!;
      return { projectId: p.id };
    },
    build: (s, c) => {
      const p = proj(s, c.projectId)!;
      const canUpdate = !updateBlock(s, p);
      return {
        text: k('event.old_game_revival.text', { project: p.name, topic: p.topicId }),
        options: [
          opt('old_game_revival', 'promote', ['hint.sales_up_some', 'hint.costs_money']),
          { ...opt('old_game_revival', 'update', ['hint.sales_up', 'hint.takes_time']), disabledReason: canUpdate ? undefined : k('hint.studio_busy') },
          opt('old_game_revival', 'sequel', ['hint.idea_for_later']),
          opt('old_game_revival', 'carry_on', ['hint.no_changes']),
        ],
      };
    },
    resolve: (s, c, o, emit: EventSink) => {
      const p = proj(s, c.projectId);
      if (!p?.result) return;
      p.result.revived = true;
      story(s, 'old_game_revival', o, { project: p.name, topic: p.topicId }, 1, [], p.id);
      if (o === 'promote') {
        s.company.money -= K().revivalPromoCost;
        p.result.salesEnded = false;
        p.result.updateWave = { startDay: s.day, strength: K().revivalWave };
      } else if (o === 'update') {
        startSupport(s, p.id, 'update');
      } else if (o === 'sequel') {
        suggestIdea(s, { kind: 'topic', source: 'sequel', topicId: p.topicId, by: getFounder(s).id, project: p.name }, emit);
      }
    },
  },
];

/** Who raises the question: the person involved, or the founder. */
export function speakerOf(state: GameState, id: string | undefined): Empirian {
  return (id && state.empirians.find((e) => e.id === id)) || getFounder(state);
}
