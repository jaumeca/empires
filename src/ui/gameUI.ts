import type { AudioPrefs, Sfx, SoundEngine } from '../audio/sound';
import type { Speed } from '../sim/config';
import type { SimEvent } from '../sim/core/events';
import { PROJECT_LIMITS } from '../sim/commands';
import { SIM_CONFIG } from '../sim/config';
import { estimatePlan, estimateProgress, teamSpeedFactor } from '../sim/estimates';
import { employees, freeWorkstations, hiringUnlocked, maxEmployees } from '../sim/systems/team';
import { NEXT_SIZE, OFFICE_SIZES } from '../content/officeSizes';
import { ACHIEVEMENTS, memoriesOf } from '../sim/systems/story';
import { biography } from '../sim/systems/biography';
import { notableRelations } from '../sim/systems/relations';
import { debtLevel } from '../sim/systems/debt';
import { FAME_ASPECTS, fameLevel, fameOf } from '../sim/systems/reputation';
import { profileFor } from '../sim/systems/ambition';
import { isFresh, unlocked } from '../sim/systems/progress';
import { nextGoal } from '../sim/systems/goals';
import { launchTier } from '../sim/systems/launch';
import { patchBlock, productStatus, supportDays, supportOf, updateBlock } from '../sim/systems/products';
import { effectiveRisk, FEATURE_CFG, featureLock } from '../sim/systems/features';
import { FEATURE_SLOTS, FEATURES, getFeature } from '../content/features';
import type { Game } from '../sim/game';
import type { Appearance, GameState, Memory, MemoryKind, PendingDecision, Project, ProjectSize, RelationKind, Role, SkillId } from '../sim/model/state';
import { progressToNext, SKILLS, specializations } from '../sim/systems/progression';
import { getActiveProject, getFounder, getProject } from '../sim/state';
import { mixPenalty, productionProgress } from '../sim/systems/project';
import type { BuildInfo } from '../app/buildInfo';
import { TutorialUI } from './tutorialUI';
import { TOPICS } from '../content/topics';
import { drawFace } from '../render/face';
import { iconUrl, type IconName } from '../render/icons';
import type { OfficeScene, TapTarget } from '../render/officeScene';
import { partColors } from '../render/models/empirian';
import {
  ACCESSORY_COUNT, CLOTH_COLORS, HAIR_COLORS, HAIR_STYLE_COUNT, hexToCss, PALETTE_HEX, PANTS_COLORS, SKIN_TONES, TOP_COUNT,
} from '../render/palette';
import { clear, h } from './dom';
import { DecorUI } from './decorUI';
import { topicMood } from '../sim/systems/world';
import { clientOf, estimateDays } from '../sim/systems/contracts';
import { fmtMoney, fmtNum1, fmtPrice, getLocale, LOCALE_NAMES, setLocale, t, tr, type Locale } from '../i18n/i18n';

export interface UIServices {
  save(): void;
  exportSave(): void;
  importSave(): Promise<void>;
  newGame(): void;
  setCamera(mode: 'iso' | 'dim'): void;
  setLocale(l: Locale): void;
  /** Sound (0.18.0); optional: the game works the same without it. */
  sound?: SoundEngine;
}

const icon = (name: IconName, size = 22) => h('img.px', { src: iconUrl(name, 32), width: size, height: size, alt: '' });

const phaseLabel = (phase: string) => t(`phase.${phase}`);
const projectName = (p: Project) => p.name || t('project.unnamed');
const names = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => t(`${prefix}.${i}`));

/**
 * Game UI layer: discreet HUD + modal cards (GDD §7). Reads state, sends commands.
 */
export class GameUI {
  private hud: HTMLElement;
  private toastBox: HTMLElement;
  private modal: HTMLElement | null = null;
  private modalKind = '';
  private speechEl: HTMLElement | null = null;
  private resumeSpeed: Speed = 1;
  private lastHudKey = '';
  private tutorial!: TutorialUI;
  private shownResultFor = new Set<string>();
  private diag: HTMLElement | null = null;
  readonly decor: DecorUI;

  constructor(private root: HTMLElement, private game: Game, private scene: OfficeScene, private services: UIServices, private debug = false, private build: BuildInfo = { version: '0.0.0-dev', commit: 'dev', date: '' }) {
    this.hud = h('div');
    this.toastBox = h('div.toasts');
    root.append(this.hud, this.toastBox);
    if (debug) {
      this.diag = h('div.diag');
      root.append(this.diag);
    }
    scene.onTap = (target) => (this.decor.active ? this.decor.onTap(target) : this.onTap(target));
    scene.onHover = (cell) => this.decor.onHover(cell);
    this.tutorial = new TutorialUI(root, scene, {
      state: () => this.state,
      dispatch: (c) => this.game.dispatch(c),
      modalKind: () => this.modalKind,
      decorActive: () => this.decor.active,
      toast: (text, ic) => this.toast(text, ic),
    });
    window.addEventListener('keydown', (ev) => this.onKey(ev));
    // A soft click on every button (0.18.0); specific moments add their own sound.
    root.addEventListener('pointerdown', (ev) => { if ((ev.target as Element | null)?.closest?.('button:not([disabled])')) this.sfx('click'); });
    this.decor = new DecorUI(root, scene, {
      state: () => this.game.state,
      dispatch: (cmd) => this.game.dispatch(cmd),
      toast: (text, ic) => this.toast(text, ic),
      sfx: (s) => this.sfx(s),
      save: () => this.services.save(),
      expand: () => this.showExpand(),
      pause: () => {
        const before = this.game.clock.speed;
        this.game.clock.setSpeed(0);
        this.hud.classList.add('hidden');
        return () => {
          this.hud.classList.remove('hidden');
          if (before !== 0) this.game.clock.setSpeed(before);
          this.renderHud(true);
        };
      },
      refreshHud: () => this.renderHud(true),
    });
    for (const p of game.state.projects) if (p.result) this.shownResultFor.add(p.id);
  }

  get state(): GameState {
    return this.game.state;
  }

  /** Called after load / new game. */
  reset(game: Game): void {
    this.game = game;
    this.closeModal();
    this.shownResultFor = new Set(game.state.projects.filter((p) => p.result).map((p) => p.id));
    this.queuedResults = [];
    this.lastHudKey = '';
    this.start();
  }

  start(): void {
    if (!this.state.setupComplete) this.showFounderCreation();
    else if (this.state.pendingDecision) this.showDecision(this.state.pendingDecision);
    this.renderHud(true);
  }

  // -------------------------------------------------------------- keyboard
  /**
   * Desktop shortcuts. Everything they do is also reachable with mouse or touch;
   * keys only call the same UI actions (never the simulation directly).
   */
  private onKey(ev: KeyboardEvent): void {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const el = ev.target as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    const s = this.state;
    if (!s.setupComplete) return;
    const k = ev.key;
    const used = (): void => ev.preventDefault();
    if (this.decor.active) {
      if (this.decor.handleKey(k)) used();
      return;
    }
    if (this.modal) {
      if (this.modalKind === 'decision' && /^[1-9]$/.test(k)) {
        const btn = this.modal.querySelectorAll<HTMLButtonElement>('.option')[Number(k) - 1];
        if (btn && !btn.disabled) { btn.click(); used(); }
        return;
      }
      if (k === 'Escape' && this.modalKind !== 'decision') {
        const close = this.modal.querySelector<HTMLButtonElement>('button.close');
        if (close) { close.click(); used(); }
      }
      return;
    }
    const speeds: Record<string, Speed> = { '1': 1, '2': 2, '3': 4, '4': 8 };
    if (k === ' ') { this.playerSpeed(this.game.clock.speed === 0 ? this.lastPlaySpeed : 0); used(); }
    else if (speeds[k]) { this.playerSpeed(speeds[k]); used(); }
    else if ((k === 'n' || k === 'N') && unlocked(s, 'newspaper')) { this.showDaily(); used(); }
    else if (k === 'd' || k === 'D') { this.decor.open(); used(); }
    else if (k === 'm' || k === 'M' || k === 'Escape') { this.showMenu(); used(); }
    else if ((k === 'c' || k === 'C') && (unlocked(s, 'contracts') || s.contracts.active)) { if (s.contracts.active) this.showContract(); else if (!getActiveProject(s)) this.showContracts(); used(); }
    else if (k === 'p' || k === 'P') {
      if (getActiveProject(s)) this.showProjectPanel();
      else if (s.support) this.showProducts();
      else if (!s.contracts.active) this.showNewProject();
      used();
    }
    else if (k === 'f' || k === 'F') { const f = getFounder(s); this.showEmpirian(f.id); used(); }
    else if (k === 'h' || k === 'H') { this.showStory(); used(); }
    else if (k === '?' || k === 'F1') { this.showHelp(); used(); }
    else if ((k === 't' || k === 'T') && (hiringUnlocked(s) || s.empirians.length > 1)) { this.showTeam(); used(); }
  }

  // ------------------------------------------------------------------- HUD
  private hudRefs: { goal?: HTMLElement; day?: HTMLElement; money?: HTMLElement; bar?: HTMLElement; bugs?: HTMLElement; days?: HTMLElement; phase?: HTMLElement } = {};

  renderHud(force = false): void {
    const s = this.state;
    const p = getActiveProject(s);
    // Structure is rebuilt only when it changes; values are patched in place so
    // buttons are never replaced under the player's finger.
    const key = JSON.stringify([this.game.clock.speed, p?.id, p?.phase, s.setupComplete, !!this.modal, s.projects.length, this.unreadNews(), s.contracts.active?.id, s.support?.projectId ?? null, unlocked(s, 'products'), s.contracts.offers.length, s.hiring.candidates.length, s.empirians.length, hiringUnlocked(s)]);
    if (force || key !== this.lastHudKey) {
      this.lastHudKey = key;
      this.buildHud();
    }
    const r = this.hudRefs;
    if (r.day) r.day.textContent = t('common.day', { day: s.day });
    if (r.goal) {
      const g = nextGoal(s);
      const key = g ? `${g.id}|${tr(g.text)}` : '';
      if (r.goal.dataset.key !== key) {
        r.goal.dataset.key = key;
        clear(r.goal);
        if (g) r.goal.append(icon('star', 16), h('span', null, tr(g.text)));
        r.goal.style.display = g ? '' : 'none';
        r.goal.dataset.goal = g?.id ?? '';
      }
    }
    if (r.money) {
      r.money.textContent = fmtMoney(s.company.money);
      r.money.classList.toggle('neg', s.company.money < 0);
    }
    if (s.support && !p && r.bar) r.bar.style.width = `${Math.round(Math.min(1, s.support.done / s.support.work) * 100)}%`;
    const ct = s.contracts.active;
    if (ct && !p) {
      if (r.bar) r.bar.style.width = `${Math.round(Math.min(1, ct.done / ct.work) * 100)}%`;
      if (r.days) r.days.textContent = t('common.days_short', { n: ct.dueDay - s.day });
    }
    if (p) {
      const prog = productionProgress(p);
      // Block 1.1: small moments of creation while the game takes shape (no windows).
      if (p.phase === 'production' || p.phase === 'concept') {
        const mark = prog >= 0.75 ? 75 : prog >= 0.5 ? 50 : prog >= 0.25 ? 25 : 0;
        const prev = this.milestones.get(p.id) ?? (prog >= 0.25 ? mark : 0); // a loaded game doesn't replay old moments
        if (!this.milestones.has(p.id)) this.milestones.set(p.id, prev);
        if (mark > prev) {
          this.milestones.set(p.id, mark);
          const first = s.projects.filter((q) => q.phase === 'released').length === 0;
          if (first || mark === 50) this.toast(t(`ms.${mark}`, { project: projectName(p) }), mark === 25 ? 'idea' : mark === 50 ? 'star' : 'rocket');
        }
      }
      if (r.bar) r.bar.style.width = `${Math.round((p.phase === 'polish' ? 1 : prog) * 100)}%`;
      if (r.bugs) r.bugs.textContent = String(p.bugs.known);
      if (r.days) r.days.textContent = t('common.days_short', { n: p.deadlineDay - s.day });
    }
  }

  private buildHud(): void {
    const s = this.state;
    const p = getActiveProject(s);
    this.hudRefs = {};
    clear(this.hud);
    if (!s.setupComplete) {
      this.hud.append(h('div.title-screen', null, h('h1', null, 'EMPIRES'), h('p', null, t('app.tagline'))));
      return;
    }
    const speed = this.game.clock.speed;
    const speedBtn = (v: Speed, label: Node | string) =>
      h('button', { class: `${speed === v ? 'on' : ''} ${v === 0 ? 'paused' : ''}`, 'aria-label': v === 0 ? t('hud.pause') : t('hud.speed', { n: v }), title: v === 0 ? t('kbd.tip', { label: t('hud.pause'), key: t('kbd.space') }) : t('kbd.tip', { label: t('hud.speed', { n: v }), key: String({ 1: 1, 2: 2, 4: 3, 8: 4 }[v]) }), dataset: { speed: String(v) }, onclick: () => this.playerSpeed(v) }, label);
    const r = this.hudRefs;
    r.day = h('span.day');
    r.money = h('span.money');
    this.hud.append(
      h('div.hud-tl', null,
        h('div.pill', null, icon('calendar'), r.day),
        h('div.pill', null, icon('coin'), r.money, h('span.company', null, s.company.name)),
        // Block 1.3: the next natural goal, one discreet line (tap to go there).
        (r.goal = h('button.pill.goal', { id: 'hud-goal', onclick: () => this.goToGoal() })),
      ),
      h('div.hud-tr', null,
        h('div.pill.speeds', null, speedBtn(0, icon('pause', 18)), speedBtn(1, '1x'), speedBtn(2, '2x'), speedBtn(4, '4x'), speedBtn(8, '8x')),
        // Progression (D-062): the newspaper appears with the first launch.
        unlocked(s, 'newspaper') ? h(`button.icon-btn.badge-host${isFresh(s, 'newspaper') ? '.fresh' : ''}`, { 'aria-label': t('daily.button'), title: t('kbd.tip', { label: t('daily.button'), key: 'N' }), id: 'hud-news', onclick: () => this.showDaily() }, icon('news'), this.unreadNews() ? h('span.badge', null, String(Math.min(9, this.unreadNews()))) : null) : null,
        h('button.icon-btn', { 'aria-label': t('decor.button'), title: t('kbd.tip', { label: t('decor.button'), key: 'D' }), id: 'hud-decor', onclick: () => this.decor.open() }, icon('decor')),
        // GT.6: the catalogue of released games, once they have a later life to look after.
        unlocked(s, 'products') ? h(`button.icon-btn.badge-host${isFresh(s, 'products') ? '.fresh' : ''}`, { 'aria-label': t('products.button'), title: t('products.button'), id: 'hud-products', onclick: () => this.showProducts() }, icon('box')) : null,
        hiringUnlocked(s) || s.empirians.length > 1 ? h(`button.icon-btn.badge-host${isFresh(s, 'team') ? '.fresh' : ''}`, { 'aria-label': t('team.button'), title: t('kbd.tip', { label: t('team.button'), key: 'T' }), id: 'hud-team', onclick: () => this.showTeam() }, icon('team'), s.hiring.candidates.length && s.empirians.length - 1 < maxEmployees(s) ? h('span.badge', null, String(s.hiring.candidates.length)) : null) : null,
        h('button.icon-btn', { 'aria-label': t('hud.menu'), title: t('kbd.tip', { label: t('hud.menu'), key: 'M' }), id: 'hud-menu', onclick: () => this.showMenu() }, icon('menu')),
      ),
    );
    const bottom = h('div.hud-bottom');
    if (p) {
      r.bar = h('i');
      r.bugs = h('span');
      r.days = h('span');
      bottom.append(
        h('div.pill.project-pill', { onclick: () => this.showProjectPanel(), 'aria-label': t('hud.open_project') },
          h('div', null, h('div.name', null, projectName(p)), h('div.phase', null, phaseLabel(p.phase))),
          h(`div.bar${p.phase === 'polish' ? '.polish' : ''}`, null, r.bar),
          h('span.stat', { title: t('hud.known_bugs') }, icon('bug', 18), r.bugs),
          h('span.stat', { title: t('hud.days_to_launch') }, icon('clock', 18), r.days),
        ),
      );
      if (p.phase === 'polish') bottom.append(h('button.big-btn.coral.pulse', { id: 'hud-release', onclick: () => this.confirmRelease() }, t('hud.release')));
    } else if (s.contracts.active) {
      const ct = s.contracts.active;
      r.bar = h('i');
      r.days = h('span');
      bottom.append(
        h('div.pill.project-pill.contract', { id: 'hud-contract', onclick: () => this.showContract() },
          h('div', null, h('div.name', null, t('contract.pill', { client: ct.clientId })), h('div.phase', null, t(`ckind.${ct.kind}`))),
          h('div.bar.contract', null, r.bar),
          h('span.stat', null, icon('clock', 18), r.days),
        ),
      );
    } else if (s.support) {
      const job = s.support;
      const jp = getProject(s, job.projectId);
      r.bar = h('i');
      bottom.append(
        h('div.pill.project-pill.contract.support', { id: 'hud-support', onclick: () => this.showProducts() },
          h('div', null, h('div.name', null, t(`support.pill.${job.kind}`, { project: jp ? projectName(jp) : '' })), h('div.phase', null, t('support.phase'))),
          h('div.bar.contract', null, r.bar),
        ),
      );
    } else if (!this.modal) {
      bottom.append(...[
        h('button.big-btn.mint', { id: 'hud-new-project', onclick: () => this.showNewProject() }, s.projects.length ? t('hud.new_project') : t('hud.first_project')),
        unlocked(s, 'contracts') ? h(`button.big-btn.ghost.badge-host${isFresh(s, 'contracts') ? '.fresh' : ''}`, { id: 'hud-contracts', onclick: () => this.showContracts() }, t('work.contracts'), s.contracts.offers.length ? h('span.badge', null, String(s.contracts.offers.length)) : null) : null,
      ].filter((x): x is HTMLButtonElement => !!x));
    }
    this.hud.append(bottom);
    // The guide's highlight follows the rebuilt buttons now, not one frame later (no flicker).
    this.tutorial?.reglow();
  }

  /** Per-frame: speech bubble position + diagnostics. */
  frame(fps: number): void {
    this.tutorial.frame();
    const s = this.state;
    const founder = s.setupComplete ? getFounder(s) : null;
    const want = founder && !this.modal && !this.decor.active && !this.tutorial.visible && !getActiveProject(s) && !s.contracts.active && !s.support && founder.activity !== 'celebrating' ? (!s.projects.length ? t('speech.first') : s.contracts.offers.length ? t('speech.idle_options') : t('speech.again')) : null;
    if (want && founder) {
      if (!this.speechEl) {
        this.speechEl = h('div.speech', { onclick: () => (this.state.projects.length ? this.showWorkChooser() : this.showNewProject()) });
        this.root.append(this.speechEl);
      }
      this.speechEl.textContent = want;
      const pos = this.scene.empirianScreenPos(founder.id);
      if (pos) {
        this.speechEl.style.left = `${pos.x}px`;
        this.speechEl.style.top = `${pos.y - 8}px`;
      }
    } else if (this.speechEl) {
      this.speechEl.remove();
      this.speechEl = null;
    }
    if (this.diag) {
      const st = this.scene.stats();
      this.diag.textContent = `FPS ${fps.toFixed(0)}  calls ${st.calls}  tris ${(st.triangles / 1000).toFixed(1)}k\ngeo ${st.geometries}  tex ${st.textures}  tick ${s.tick}  cam ${this.scene.getCameraMode()}`;
    }
  }

  setSpeed(v: Speed): void {
    if (this.modal && v !== 0) this.closeModal();
    this.game.clock.setSpeed(v);
    // Remember the player's choice, including a manual pause: closing a menu must not unpause.
    this.resumeSpeed = v;
    if (v !== 0) this.lastPlaySpeed = v;
    this.renderHud(true);
  }
  /** A speed change made by the player (buttons, keys): also teaches the tutorial step. */
  private playerSpeed(v: Speed): void {
    this.setSpeed(v);
    this.tutorial.mark('speed');
  }
  /** Last non-zero speed chosen by the player (Space toggles between it and pause). */
  private lastPlaySpeed: Speed = 1;

  // ---------------------------------------------------------------- events
  handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'decision_requested':
          if (this.state.pendingDecision) setTimeout(() => this.state.pendingDecision && this.showDecision(this.state.pendingDecision), 650);
          break;
        case 'unlock':
          this.sfx('unlock');
          // Progression (D-062): a friendly "New!" note, one at a time, and the new button appears.
          this.unlockQueue.push(e.unlockId);
          if (this.unlockQueue.length === 1) this.nextUnlockNote();
          this.renderHud(true);
          break;
        case 'project_released':
          this.services.save();
          this.logModal(`released ${e.projectId}`);
          this.sfx('release');
          { const sc = getProject(this.state, e.projectId)?.result?.averageScore ?? 0; if (sc >= 6.5) setTimeout(() => this.sfx('celebrate'), 900); }
          this.launchBanner(e.projectId);
          setTimeout(() => this.showResults(e.projectId), 1800);
          break;
        case 'bug_created': case 'bug_found': this.sfx('bug'); break;
        case 'bug_fixed': this.sfx('fixed'); break;
        case 'idea': this.sfx('idea'); break;
        case 'support_done': {
          this.sfx('confirm');
          const sp = getProject(this.state, e.projectId);
          this.toast(t(`toast.support_done.${e.kind}`, { project: sp ? projectName(sp) : '' }), e.kind === 'patch' ? 'check' : 'rocket');
          this.services.save();
          break;
        }
        case 'product_happening': {
          // GT.6: a quiet note about a product's later life (never a window).
          const hp = getProject(this.state, e.projectId);
          this.toast(t(`ledger.product.${e.kind}`, { project: hp?.name ?? '' }), e.kind === 'abandoned' ? 'alert' : 'box');
          break;
        }
        case 'phase_changed':
          if (e.phase === 'polish') this.toast(t('toast.polish'), 'star');
          else if (e.phase === 'production') this.toast(t('toast.production'), 'idea');
          break;
        case 'energy_low':
          this.toast(t('toast.energy_low'), 'sweat');
          break;
        case 'money_low':
          this.toast(t('toast.money_low'), 'alert');
          break;
        case 'contract_done':
          this.sfx('coin');
          this.toast(e.lateDays > 0 ? t('toast.contract_late', { days: e.lateDays, pay: e.pay }) : t('toast.contract_done', { pay: e.pay }), 'coin');
          this.services.save();
          break;
        case 'news':
          if (e.importance === 'major') {
            const n = this.state.world.news.find((x) => x.id === e.newsId);
            if (n) this.toast(t('daily.toast', { title: t(`news.${n.kind}.title`, n.params) }), 'news');
          }
          break;
        case 'achievement':
          this.sfx('celebrate');
          this.toast(t('toast.achievement', { achievement: t(`ach.${e.achievementId}.name`), item: t(`item.${e.itemId}.name`) }), 'star');
          this.services.save();
          break;
        case 'memory': {
          const m = this.state.story.memories.find((x) => x.id === e.memoryId);
          if (m && !['decision', 'achievement', 'founded', 'hire', 'first_hire', 'farewell', 'unlock'].includes(m.kind)) this.toast(t('toast.memory'), 'heart');
          break;
        }
        case 'candidates_arrived':
          this.toast(t('toast.candidates', { count: e.count }), 'team');
          break;
        case 'hired': {
          this.sfx('confirm');
          const who = this.state.empirians.find((x) => x.id === e.empirianId);
          if (who) this.toast(t('toast.hired', { name: who.name }), 'team');
          this.services.save();
          break;
        }
        case 'fired':
          this.toast(t('toast.fired'), 'alert');
          this.services.save();
          break;
        case 'skill_up': {
          const who = this.state.empirians.find((x) => x.id === e.empirianId);
          if (who) this.toast(t('toast.skill_up', { name: who.name, skill: e.skill, level: e.level }), 'star');
          break;
        }
        case 'sales_week': {
          const p = getProject(this.state, e.projectId);
          if (p?.result && p.result.weeklySales.length <= 3) this.sfx('coin');
          if (p?.result && p.result.weeklySales.length <= 3) this.toast(t('toast.sales_week', { project: projectName(p), units: e.units, revenue: e.revenue }), 'coin');
          if (this.modalKind === `results:${e.projectId}`) this.showResults(e.projectId);
          break;
        }
        case 'day_started':
          if (this.state.day % 7 === 0) this.services.save();
          break;
      }
    }
    this.renderHud();
  }

  private countedUp = new Set<string>();
  private milestones = new Map<string, number>();

  /** Block 5: "Now on sale!" — the game's name over the office while the reviews come in. */
  private launchBanner(projectId: string): void {
    const p = getProject(this.state, projectId);
    if (!p) return;
    const el = h('div.launch-banner', { id: 'launch-banner' }, icon('box', 40), h('div', null, h('div.t', null, projectName(p)), h('div.d', null, t('launch.on_sale'))));
    this.root.append(el);
    setTimeout(() => el.classList.add('out'), 1500);
    setTimeout(() => el.remove(), 2100);
  }

  /** Tapping the goal opens what it is about. */
  private goToGoal(): void {
    const g = nextGoal(this.state);
    if (!g || this.modal) return;
    if (g.action === 'new_project') this.showNewProject();
    else if (g.action === 'project') this.showProjectPanel();
    else if (g.action === 'decor') this.decor.open();
    else if (g.action === 'contracts') this.showContracts();
    else if (g.action === 'team') this.showTeam();
    else if (g.action === 'story') this.showStory();
  }

  private unlockQueue: string[] = [];
  private nextUnlockNote(): void {
    const id = this.unlockQueue[0];
    if (!id) return;
    const note = h('div.toast.unlock', { dataset: { unlock: id } }, icon('star', 22),
      h('div', null, h('div.t', null, t('unlock.new', { what: t(`unlock.${id}.name`) })), h('div.d', null, t(`unlock.${id}.text`))));
    this.toastBox.append(note);
    setTimeout(() => note.remove(), 6500);
    setTimeout(() => { this.unlockQueue.shift(); this.nextUnlockNote(); }, 1600);
  }

  /** Plays a sound if there is sound (0.18.0). */
  sfx(s: Sfx): void {
    this.services.sound?.play(s);
  }

  toast(text: string, ic: IconName = 'alert'): void {
    const t = h('div.toast', null, icon(ic, 18), text);
    this.toastBox.append(t);
    // Short (phone landscape) screens show fewer toasts so they never cover the office.
    const max = window.innerHeight < 500 ? 1 : 3;
    while (this.toastBox.children.length > max) this.toastBox.firstChild?.remove();
    setTimeout(() => t.remove(), 3800);
  }

  private onTap(target: TapTarget): void {
    if (this.modal) return;
    const s = this.state;
    if (!s.setupComplete) return;
    switch (target.kind) {
      case 'computer':
        if (getActiveProject(s)) this.showProjectPanel();
        else if (s.contracts.active) this.showContract();
        else if (s.support) this.showProducts();
        else this.showWorkChooser();
        break;
      case 'empirian':
        this.showEmpirian(target.id);
        break;
      case 'product':
        this.showResults(target.id);
        break;
      case 'shelf':
        // The shelf (and the trophies) open the studio's story (ML.2).
        this.showStory();
        break;
      case 'poster':
        this.toast(t('toast.poster'), 'rocket');
        break;
      case 'news':
        this.showDaily();
        break;
      case 'plant':
        this.toast(t('toast.plant'), 'heart');
        break;
      case 'beanbag':
        this.toast(t('toast.armchair'), 'idea');
        break;
    }
  }

  // ---------------------------------------------------------------- modals
  private openModal(kind: string, card: HTMLElement, opts: { pause?: boolean; cls?: string } = {}): void {
    this.closeModal(false, true);
    this.logModal(`open ${kind}`);
    if (opts.pause !== false) {
      if (this.game.clock.speed !== 0) this.resumeSpeed = this.game.clock.speed;
      this.game.clock.setSpeed(0);
    }
    this.modalKind = kind;
    if (kind === 'decision') this.sfx('decision');
    else if (!kind.startsWith('results:') && kind !== 'creator') this.sfx('open');
    this.modal = h(`div.backdrop${opts.cls ? '.' + opts.cls : ''}`, {
      onpointerdown: (ev: Event) => {
        if (ev.target === this.modal && kind !== 'decision' && kind !== 'creator') this.closeModal(true);
      },
    }, card);
    this.root.append(this.modal);
    this.renderHud(true);
  }

  closeModal(resume = false, replacing = false): void {
    if (!this.modal) return;
    this.logModal(`close ${this.modalKind}${replacing ? ' (replaced)' : ''}`);
    // The reviews step counts once the player has seen (and closed) the results — not when something replaced them.
    if (this.modalKind.startsWith('results:') && !replacing) this.tutorial.mark('reviews');
    if (!replacing) this.sfx('close');
    this.modal.remove();
    this.modal = null;
    this.modalKind = '';
    if (resume && this.state.setupComplete && !this.state.pendingDecision) this.game.clock.setSpeed(this.resumeSpeed);
    this.renderHud(true);
    if (!replacing) this.showWaiting();
  }

  /** What had to wait for the screen to be free: a pending decision first, then launch results (0.17.0). */
  private queuedResults: string[] = [];
  /** Last modal moves (for ?debug diagnostics of intermittent UI failures). */
  readonly modalLog: string[] = [];
  private logModal(what: string): void {
    this.modalLog.push(`${Math.round(performance.now())} d${this.state.day}t${this.state.tick} ${what}`);
    if (this.modalLog.length > 40) this.modalLog.shift();
  }
  private showWaiting(): void {
    setTimeout(() => {
      if (this.modal) return;
      if (this.state.pendingDecision) this.showDecision(this.state.pendingDecision);
      else if (this.queuedResults.length) this.showResults(this.queuedResults.shift()!);
    }, 350);
  }

  private closeBtn(): HTMLElement {
    return h('button.close', { 'aria-label': t('common.close'), onclick: () => this.closeModal(true) }, '×');
  }

  // ------------------------------------------------------- founder creation
  showFounderCreation(draft?: { a: Appearance; name: string; company: string }): void {
    const founder = getFounder(this.state);
    // The draft lives in the UI; the state only changes on setup_founder.
    const a: Appearance = { ...(draft?.a ?? founder.appearance) };
    let name = draft?.name ?? (founder.name === 'Alex' ? '' : founder.name);
    let company = draft?.company ?? '';
    this.scene.setFocus(true);
    const update = () => this.scene.setAppearance(founder.id, a);

    const nameInput = h('input', { type: 'text', placeholder: t('creator.name'), id: 'founder-name', maxLength: 24, value: name, oninput: (e: Event) => (name = (e.target as HTMLInputElement).value) });
    const companyInput = h('input', { type: 'text', placeholder: t('creator.company'), id: 'company-name', maxLength: 32, value: company, oninput: (e: Event) => (company = (e.target as HTMLInputElement).value) });

    const card = h('div.card', null,
      h('h2', null, t('creator.title')),
      h('p.sub', null, t('creator.sub')),
      h('div.section', null, nameInput),
      h('div.section', null, companyInput),
      ...this.appearanceControls(a, update),
      h('div.actions', null,
        h('button.big-btn.ghost', { onclick: () => { a.skin = rnd(8); a.hairStyle = rnd(8); a.hairColor = rnd(12); a.top = rnd(5); a.topColor = rnd(10); a.pantsColor = rnd(6); a.accessory = rnd(6); update(); this.showFounderCreation({ a, name, company }); } }, t('creator.random')),
        h('button.big-btn.mint', { id: 'start-game', onclick: () => {
          const finalName = name.trim() || 'Alex';
          const res = this.game.dispatch({ type: 'setup_founder', name: finalName, companyName: company.trim() || `${finalName} Games`, appearance: a });
          if (!res.ok) return this.toast(t(`error.${res.error}`));
          this.scene.setFocus(false);
          this.closeModal();
          this.services.save();
          this.renderHud(true);
        } }, t('creator.start')),
      ),
    );
    this.openModal('creator', card, { cls: 'creator' });
  }


  /** Appearance controls shared by the founder creator and the editor (AW.C). */
  private appearanceControls(a: Appearance, update: () => void): HTMLElement[] {
    const swatches = (list: number[], key: keyof Appearance) => {
      const row = h('div.row');
      const draw = () => {
        clear(row);
        list.forEach((idx, i) =>
          row.append(h('button.swatch', { class: a[key] === i ? 'on' : '', style: { background: hexToCss(PALETTE_HEX[idx] ?? 0) }, 'aria-label': `${key} ${i + 1}`, onclick: () => { a[key] = i; update(); draw(); } })),
        );
      };
      draw();
      return row;
    };
    const stepper = (names: string[], key: keyof Appearance) => {
      const label = h('span');
      const draw = () => (label.textContent = names[a[key]] ?? '');
      const mv = (d: number) => { a[key] = (a[key] + d + names.length) % names.length; update(); draw(); };
      draw();
      return h('div.stepper', null, h('button', { 'aria-label': t('common.prev'), onclick: () => mv(-1) }, '‹'), label, h('button', { 'aria-label': t('common.next'), dataset: { step: key }, onclick: () => mv(1) }, '›'));
    };
    return [
      h('div.grid2', null,
        h('div.section', null, h('div.label', null, t('creator.hair')), stepper(names('hair', HAIR_STYLE_COUNT), 'hairStyle')),
        h('div.section', null, h('div.label', null, t('creator.top')), stepper(names('top', TOP_COUNT), 'top')),
      ),
      h('div.section', null, h('div.label', null, t('creator.skin')), swatches(SKIN_TONES, 'skin')),
      h('div.section', null, h('div.label', null, t('creator.hair_color')), swatches(HAIR_COLORS, 'hairColor')),
      h('div.section', null, h('div.label', null, t('creator.top_color')), swatches(CLOTH_COLORS, 'topColor')),
      h('div.grid2', null,
        h('div.section', null, h('div.label', null, t('creator.pants')), swatches(PANTS_COLORS, 'pantsColor')),
        h('div.section', null, h('div.label', null, t('creator.accessory')), stepper(names('acc', ACCESSORY_COUNT), 'accessory')),
      ),
    ];
  }

  /**
   * Edit an Empirian's looks, name and nickname (AW.C). Only those change:
   * skills, personality, experience, salary and memories are untouched.
   */
  showEditor(id: string): void {
    const e = this.state.empirians.find((x) => x.id === id);
    if (!e) return;
    const original: Appearance = { ...e.appearance };
    const a: Appearance = { ...e.appearance };
    let name = e.name;
    let nickname = e.nickname ?? '';
    this.scene.setFocus(true, id);
    const update = () => this.scene.setAppearance(id, a);
    const finish = (save: boolean) => {
      if (save) {
        const r = this.game.dispatch({ type: 'edit_empirian', empirianId: id, name, nickname, appearance: a });
        if (!r.ok) return this.toast(t(`error.${r.error}`), 'alert');
        this.services.save();
        this.toast(t('editor.saved', { name: name.trim() }), 'check');
      } else this.scene.setAppearance(id, original);
      this.scene.setFocus(false);
      this.closeModal(true);
    };
    const card = h('div.card.editor', null,
      h('h2', null, t('editor.title', { name: e.name })),
      h('p.sub', null, t('editor.sub')),
      h('div.grid2', null,
        h('div.section', null, h('div.label', null, t('editor.name')), h('input', { type: 'text', id: 'editor-name', maxLength: 24, value: name, oninput: (ev: Event) => (name = (ev.target as HTMLInputElement).value) })),
        h('div.section', null, h('div.label', null, t('editor.nickname')), h('input', { type: 'text', id: 'editor-nickname', maxLength: 16, placeholder: t('editor.nickname_ph'), value: nickname, oninput: (ev: Event) => (nickname = (ev.target as HTMLInputElement).value) })),
      ),
      ...this.appearanceControls(a, update),
      h('div.actions', null,
        h('button.big-btn.ghost', { id: 'editor-cancel', onclick: () => finish(false) }, t('editor.cancel')),
        h('button.big-btn.mint', { id: 'editor-save', onclick: () => finish(true) }, t('editor.save')),
      ),
    );
    this.openModal('editor', card, { cls: 'creator', pause: true });
  }

  // ------------------------------------------------------------ new project
  showNewProject(): void {
    const s = this.state;
    if (getActiveProject(s)) return this.showProjectPanel();
    const founder = getFounder(s);
    const maxBudget = Math.max(0, Math.floor(Math.min(s.company.money - 500, 8000) / 100) * 100);
    // Progression (D-062): the first game is simple; planning tools come with experience.
    const planning = unlocked(s, 'planning');
    const studio = unlocked(s, 'studio');
    const plan = {
      name: ((ideas) => ideas[s.projects.length % ideas.length]!)(t('name_ideas').split('|')),
      topicId: TOPICS[0]!.id,
      size: 'small' as ProjectSize,
      focus: 0.5,
      budget: Math.min(1500, maxBudget),
      days: 42,
      price: 9.99,
      features: [] as string[],
      prototype: false,
    };
    const est = h('div.row');
    const budgetLbl = h('span');
    const daysLbl = h('span');
    const focusLbl = h('span');
    const refresh = () => {
      // Features and a prototype add work (AW.D): the estimate includes them.
      const extra = plan.features.reduce((a, id) => a + (getFeature(id)?.work ?? 0), 0) + (plan.prototype ? FEATURE_CFG.prototypeWork : 0) - (s.company.solidBase ? SIM_CONFIG.debt.solidBaseSaving : 0);
      const e = estimatePlan(founder, plan.size, plan.focus, plan.budget, plan.days, teamSpeedFactor(s, plan.focus) / (1 + extra));
      clear(est);
      const verdict = { too_short: 'bad', tight: 'warn', ok: 'good', generous: 'warn' }[e.verdict];
      est.append(
        h('span.chip', null, icon('clock', 16), t('np.production_est', { min: e.productionDays[0], max: e.productionDays[1] })),
        h(`span.chip.${verdict}`, null, t(`np.verdict.${e.verdict}`)),
      );
      // D.4: what kind of project this plan makes (same system, different strategy).
      const profile = profileFor(s, plan.size, plan.features.length);
      if (planning && profile !== 'standard') est.append(h(`span.chip.profile.${profile}`, { id: 'np-profile', title: t(`profile.${profile}.desc`) }, icon(profile === 'indie' ? 'heart' : 'rocket', 16), t(`profile.${profile}`)));
      // F3.8: what players expect from this studio.
      const trust = planning ? fameLevel(fameOf(s).quality) : 'neutral';
      if (trust === 'great' || trust === 'good') est.append(h('span.chip.good', { id: 'np-fame' }, icon('heart', 16), t('np.fame.trust')));
      else if (trust === 'shaky' || trust === 'poor') est.append(h('span.chip.warn', { id: 'np-fame' }, icon('sweat', 16), t('np.fame.doubt')));
      // F3.4: what the studio's code brings into this game.
      const inherited = s.company.techDebt ?? 0;
      if (studio && debtLevel(inherited) !== 'solid') est.append(h('span.chip.warn', { id: 'np-debt', title: t('newproject.inherited_debt', { level: debtLevel(inherited) }) }, icon('code', 16), `${t('project.code')}: ${t(`debt.${debtLevel(inherited)}`)}`));
      if (s.company.solidBase) est.append(h('span.chip.good', { id: 'np-solid', title: t('newproject.solid_base') }, icon('star', 16), t('newproject.solid_base')));
      budgetLbl.textContent = t('np.budget_value', { budget: plan.budget, marketing: plan.budget * 0.3 });
      daysLbl.textContent = t('np.deadline_value', { days: plan.days, day: s.day + plan.days });
      focusLbl.textContent = t(plan.focus < 0.35 ? 'np.focus.design' : plan.focus > 0.65 ? 'np.focus.tech' : 'np.focus.balanced');
    };
    const topicTiles = h('div.tiles');
    const drawTopics = () => {
      clear(topicTiles);
      for (const topic of TOPICS) {
        topicTiles.append(h('button.tile', { class: plan.topicId === topic.id ? 'on' : '', dataset: { topic: topic.id }, onclick: () => { plan.topicId = topic.id; drawTopics(); drawFeatures(); } },
          h('div.t', null, t(`topic.${topic.id}.name`)),
          (() => { const m = topicMood(s, topic.id); return m === 'calm' ? null : h(`span.mood.${m}`, null, t(`mood.${m}`)); })(),
          h('div.d', null, t(`topic.${topic.id}.blurb`))));
      }
    };
    drawTopics();
    // Features (AW.D.1): toggles with words, not numbers.
    const featureBox = h('div.features');
    const drawFeatures = () => {
      clear(featureBox);
      const slots = FEATURE_SLOTS[plan.size] ?? 2;
      plan.features = plan.features.filter((id) => { const f = getFeature(id); return f && !featureLock(s, f, plan.size); }).slice(0, slots);
      featureBox.append(h('label', null, t('np.features', { n: slots })));
      const grid = h('div.feature-grid');
      // Only what can be chosen now (no wall of padlocks); one line says what comes next.
      const nextLocked = FEATURES.find((f) => featureLock(s, f, plan.size) && featureLock(s, f, plan.size) !== 'too_small');
      for (const f of FEATURES) {
        const lock = featureLock(s, f, plan.size);
        if (lock) continue;
        const on = plan.features.includes(f.id);
        const fit = f.fit[plan.topicId] ?? 0;
        const chips = [
          t(f.work <= 0.2 ? 'fchip.work_low' : f.work <= 0.3 ? 'fchip.work_mid' : 'fchip.work_high'),
          ((r) => (r >= 0.3 ? t('fchip.risk_high') : r >= 0.2 ? t('fchip.risk') : null))(effectiveRisk(s, f)),
          f.appeal > 0 && fit >= 0.5 ? t('fchip.fit_good') : f.appeal > 0 && fit <= -0.3 ? t('fchip.fit_bad') : null,
          f.reach >= 0.1 ? t('fchip.reach') : null,
        ].filter(Boolean) as string[];
        grid.append(h(`button.feature${on ? '.on' : ''}${lock ? '.locked' : ''}`, { dataset: { feature: f.id }, disabled: !!lock || (!on && plan.features.length >= slots), title: lock ? t(`flock.${lock}`) : t(`feature.${f.id}.desc`), onclick: () => {
          plan.features = on ? plan.features.filter((x) => x !== f.id) : [...plan.features, f.id];
          drawFeatures();
          refresh();
        } },
          h('div.t', null, t(`feature.${f.id}`)),
          lock ? h('div.d', null, t(`flock.${lock}`)) : h('div.chips', null, ...chips.map((c) => h(`span.chip${c === t('fchip.fit_bad') || c === t('fchip.risk_high') ? '.bad' : c === t('fchip.fit_good') || c === t('fchip.reach') ? '.good' : ''}`, null, c))),
        ));
      }
      featureBox.append(...[grid, h('div.hint', null, t('np.features_hint')),
        nextLocked ? h('div.hint.next-unlock', { id: 'np-next-feature' }, icon('star', 14), ` ${t('np.next_feature', { feature: nextLocked.id, how: t(`flock.${featureLock(s, nextLocked, plan.size)}`) })}`) : null,
        studio ? h('label.check', null,
          h('input', { type: 'checkbox', id: 'np-prototype', checked: plan.prototype, onchange: (e: Event) => { plan.prototype = (e.target as HTMLInputElement).checked; refresh(); } }),
          ` ${t('np.prototype', { cost: FEATURE_CFG.prototypeCost })}`) : null,
        studio ? h('div.hint', null, t('np.prototype_hint')) : null].filter((x): x is HTMLDivElement | HTMLLabelElement => !!x));
    };
    drawFeatures();
    const seg = (options: [string, string][], get: () => string, set: (v: string) => void) => {
      const el = h('div.seg');
      const draw = () => {
        clear(el);
        for (const [v, label] of options) el.append(h('button', { class: get() === v ? 'on' : '', onclick: () => { set(v); draw(); refresh(); } }, label));
      };
      draw();
      return el;
    };
    const nameInput = h('input', { type: 'text', value: plan.name, maxLength: 32, oninput: (e: Event) => (plan.name = (e.target as HTMLInputElement).value) });

    const card = h('div.card.wide', null, this.closeBtn(),
      h('h2', null, t('np.title')),
      h('p.sub', null, t('np.sub', { money: s.company.money, living: SIM_CONFIG.economy.dailyLivingCost })),
      h('div.cols', null,
        h('div.col', null,
          h('div.section', null, h('label', null, t('np.name')), nameInput),
          h('div.section', null, h('label', null, t('np.topic')), topicTiles),
          // Progression (D-062): size with the "studio" unlock, price with "planning".
          planning || studio ? h('div.grid2', null,
            studio ? h('div.section', null, h('label', null, t('np.size')), seg([['small', t('np.size.small')], ['medium', t('np.size.medium')]], () => plan.size, (v) => { plan.size = v as ProjectSize; drawFeatures(); })) : null,
            planning ? h('div.section', null, h('label', null, t('np.price')), seg(PROJECT_LIMITS.prices.map((p) => [String(p), fmtPrice(p)]), () => String(plan.price), (v) => (plan.price = Number(v)))) : null,
          ) : null,
        ),
        h('div.col', null,
          h('div.section', null, h('label', null, t('np.focus')),
            h('input', { type: 'range', min: 0, max: 100, value: plan.focus * 100, 'aria-label': t('np.focus'), oninput: (e: Event) => { plan.focus = Number((e.target as HTMLInputElement).value) / 100; refresh(); } }),
            h('div.hint', null, focusLbl, ` · ${t('np.focus_hint')}`)),
          planning ? h('div.section', null, h('label', null, t('np.budget')),
            h('input', { type: 'range', min: 0, max: maxBudget, step: 100, value: plan.budget, 'aria-label': t('np.budget'), oninput: (e: Event) => { plan.budget = Number((e.target as HTMLInputElement).value); refresh(); } }),
            h('div.hint', null, budgetLbl, ` · ${t('np.budget_hint')}`)) : null,
          h('div.section', null, h('label', null, t('np.deadline')),
            h('input', { type: 'range', min: PROJECT_LIMITS.minDays, max: PROJECT_LIMITS.maxDays, step: 7, value: plan.days, 'aria-label': t('np.deadline'), oninput: (e: Event) => { plan.days = Number((e.target as HTMLInputElement).value); refresh(); } }),
            h('div.hint', null, daysLbl)),
          est,
          planning ? h('div.section', null, featureBox) : h('p.hint.next-unlock', { id: 'np-next' }, icon('star', 16), ` ${t('np.next_planning')}`),
        ),
      ),
      h('div.actions.sticky', null,
        h('button.big-btn.mint', { id: 'start-project', onclick: () => {
          const res = this.game.dispatch({ type: 'start_project', ...plan });
          if (!res.ok) return this.toast(t(`error.${res.error}`));
          this.closeModal();
          this.setSpeed(this.resumeSpeed || 1);
          this.toast(t('toast.go'), 'rocket');
        } }, t('np.start')),
      ),
    );
    refresh();
    this.openModal('new-project', card);
  }

  // ---------------------------------------------------------- project panel
  showProjectPanel(): void {
    this.tutorial.mark('progress');
    const s = this.state;
    const p = getActiveProject(s);
    if (!p) return this.showNewProject();
    const founder = getFounder(s);
    const est = estimateProgress(p, founder);
    const send = (cmd: Parameters<Game['dispatch']>[0]) => {
      const r = this.game.dispatch(cmd);
      if (!r.ok) this.toast(t(`error.${r.error}`));
      this.showProjectPanel();
    };
    const seg = (options: [string, string][], current: string, onPick: (v: string) => void) =>
      h('div.seg', null, ...options.map(([v, l]) => h('button', { class: current === v ? 'on' : '', onclick: () => onPick(v) }, l)));
    const prog = productionProgress(p);
    const card = h('div.card.wide', null, this.closeBtn(),
      h('h2', null, projectName(p)),
      h('p.sub', null, t('pp.sub', { topic: p.topicId, phase: phaseLabel(p.phase), day: s.day, deadline: p.deadlineDay })),
      h('div.row', null,
        h('span.chip', null, t('pp.content', { pct: prog })),
        h('span.chip', null, icon('star', 16), t('pp.quality', { min: est.quality[0], max: est.quality[1] })),
        h('span.chip', null, icon('bug', 16), t('pp.bugs', { known: p.bugs.known, min: est.hiddenBugs[0], max: est.hiddenBugs[1] })),
        // F3.4: the state of the code in words, not a number.
        // Code (F3.4) appears with the "studio" unlock (D-062).
        !unlocked(s, 'studio') ? null : ((lvl) => h(`span.chip.code.${lvl === 'solid' ? 'good' : lvl === 'patched' ? 'warn' : 'bad'}`, { id: 'pp-code', title: t('help.debt.text') }, icon('code', 16), `${t('project.code')}: ${t(`debt.${lvl}`)}`))(debtLevel(p.debt ?? 0)),
        h(`span.chip.${founder.energy < 30 ? 'bad' : 'good'}`, null, icon('sweat', 16), t('pp.energy', { n: founder.energy })),
        unlocked(s, 'planning') ? h('span.chip', null, icon('heart', 16), t('pp.hype', { n: p.hype })) : null,
        unlocked(s, 'planning') ? h('span.chip', null, icon('coin', 16), t('pp.spent', { spent: p.spent, budget: p.budget })) : null,
      ),
      h('div.cols', null, h('div.col', null,
      h('div.section', null, h('label', null, t('pp.pace')),
        seg([['relaxed', t('pp.pace.relaxed')], ['normal', t('pp.pace.normal')], ['crunch', t('pp.pace.crunch')]], p.pace, (v) => send({ type: 'adjust_project', pace: v as Project['pace'] })),
        h('div.hint', null, t('pp.pace_hint'))),
      !unlocked(s, 'planning') ? null : h('div.section', null, h('label', null, t('pp.testing')),
        seg([['0.2', t('pp.testing.low')], ['0.6', t('pp.testing.mid')], ['0.9', t('pp.testing.high')]], String(p.testFocus), (v) => send({ type: 'adjust_project', testFocus: Number(v) }))),
      ), h('div.col', null,
      h('div.grid2', null,
        h('div.section', null, h('label', null, t('pp.deadline')),
          h('div.stepper', null,
            h('button', { onclick: () => send({ type: 'adjust_project', deadlineDay: p.deadlineDay - 7 }) }, '−7'),
            h('span', null, t('common.day', { day: p.deadlineDay })),
            h('button', { onclick: () => send({ type: 'adjust_project', deadlineDay: p.deadlineDay + 7 }) }, '+7')),
          h('div.hint', null, t(p.deadlineDay > p.originalDeadlineDay ? 'pp.deadline_late' : 'pp.deadline_announced'))),
        !unlocked(s, 'planning') ? null : h('div.section', null, h('label', null, t('pp.budget')),
          h('div.stepper', null,
            h('button', { onclick: () => send({ type: 'adjust_project', budget: Math.max(Math.ceil(p.spent), p.budget - 500) }) }, '−'),
            h('span', null, fmtMoney(p.budget)),
            h('button', { onclick: () => send({ type: 'adjust_project', budget: p.budget + 500 }) }, '+')),
          h('div.hint', null, t('pp.budget_hint'))),
      ))),
      h('div.actions.sticky', null,
        h('button.big-btn.coral', { disabled: p.phase === 'concept', onclick: () => this.confirmRelease() }, p.phase === 'polish' ? t('pp.release') : t('pp.release_early')),
        h('button.big-btn.mint', { onclick: () => this.closeModal(true) }, t('pp.keep_working')),
      ),
    );
    this.openModal('project', card);
  }

  private confirmRelease(): void {
    const p = getActiveProject(this.state);
    if (!p) return;
    const unfinished = p.phase !== 'polish';
    const card = h('div.card.narrow', null,
      h('h2', null, t('rel.title', { project: projectName(p) })),
      h('p.sub', null, unfinished ? t('rel.unfinished', { pct: productionProgress(p) }) : t('rel.finished', { bugs: p.bugs.known })),
      h('div.actions', null,
        h('button.big-btn.ghost', { onclick: () => this.closeModal(true) }, t('rel.not_yet')),
        h('button.big-btn.coral', { id: 'confirm-release', onclick: () => {
          this.closeModal();
          const r = this.game.dispatch({ type: 'release' });
          if (!r.ok) this.toast(t(`error.${r.error}`));
        } }, t('rel.confirm')),
      ),
    );
    this.openModal('confirm-release', card);
  }

  // --------------------------------------------------------------- decision
  private portrait(id: string): HTMLCanvasElement {
    const e = this.state.empirians.find((x) => x.id === id) ?? getFounder(this.state);
    return this.portraitOf(e.appearance, 'surprised');
  }

  private portraitOf(a: Appearance, mood: Parameters<typeof drawFace>[1] = 'happy'): HTMLCanvasElement {
    const c = h('canvas.portrait', { width: 40, height: 40 });
    const ctx = c.getContext('2d');
    if (ctx) {
      drawFace(ctx, mood, partColors(a).skin, 4);
      ctx.fillStyle = hexToCss(PALETTE_HEX[partColors(a).hair] ?? 0);
      ctx.fillRect(0, 0, 40, 6);
    }
    return c;
  }

  showDecision(d: PendingDecision): void {
    if (this.modalKind === 'decision') return;
    // A launch's results are never swept away by a decision: it waits until they are closed (0.17.0).
    if (this.modalKind.startsWith('results:')) return;
    const speaker = this.state.empirians.find((e) => e.id === d.speakerId);
    const card = h('div.card.decision.wide', null,
      h('div.row', { style: { alignItems: 'flex-start', flexWrap: 'nowrap' } },
        this.portrait(d.speakerId),
        h('div', { style: { flex: '1' } }, h('div.label', { style: { fontWeight: '900', marginBottom: '4px' } }, speaker?.name ?? ''), h('div.quote', null, tr(d.text))),
      ),
      h('div.options', null, ...d.options.map((o, i) =>
        h('button.option', { dataset: { option: o.id }, disabled: !!o.disabledReason, onclick: () => {
          const r = this.game.dispatch({ type: 'choose_option', decisionId: d.id, optionId: o.id });
          if (!r.ok) return this.toast(t(`error.${r.error}`));
          if (this.resumeSpeed === 0) this.resumeSpeed = 1;
          this.closeModal(o.id !== 'release');
          this.services.save();
        } },
          h('div.t', null, h('kbd.key-hint', null, String(i + 1)), tr(o.label)),
          h('div.hs', null, ...o.hints.map((x) => h('span.chip', null, tr(x)))),
        ),
      )),
    );
    this.openModal('decision', card, { cls: 'desk-side' });
  }

  // ---------------------------------------------------------------- results
  showResults(projectId: string): void {
    const p = getProject(this.state, projectId);
    const r = p?.result;
    if (!p || !r) return;
    this.shownResultFor.add(projectId);
    // Never cover a decision (it would stay pending and invisible, with the game paused): wait (0.17.0).
    if (this.modalKind === 'decision' || (this.state.pendingDecision && !this.modalKind.startsWith('results:'))) {
      if (!this.queuedResults.includes(projectId)) this.queuedResults.push(projectId);
      this.logModal(`queue results ${projectId} (modal ${this.modalKind}, pending ${this.state.pendingDecision?.kind ?? '-'})`);
      return;
    }
    const ledger = this.state.ledger;
    const why = r.explanation.map((id) => ledger.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
    const maxW = Math.max(1, ...r.weeklySales);
    const verdict = t(r.averageScore >= 8 ? 'res.verdict.hit' : r.averageScore >= 6.5 ? 'res.verdict.good' : r.averageScore >= 5 ? 'res.verdict.meh' : 'res.verdict.lesson');
    // Block 5: the emotional headline of the launch.
    const tier = launchTier(this.state, p);
    const lesson = tier === 'flop' ? why.find((e) => e.tone < 0) : null;
    const scoreEl = h('div.score-big', { id: 'res-score' }, fmtNum1(r.averageScore));
    const card = h(`div.card.wide.results.tier-${tier}`, null, this.closeBtn(),
      h('div.tier-banner', { dataset: { tier } }, icon(tier === 'flop' ? 'sweat' : tier === 'ok' ? 'check' : 'star', 22), h('span', null, t(`res.tier.${tier}`))),
      h('h2', null, projectName(p)),
      h('p.sub', null, t('res.sub', { verdict, day: r.releasedDay, price: r.price })),
      h('div.row', null,
        scoreEl,
        h('div', null,
          h('div.chip', null, icon('box', 16), t('res.units', { n: r.totalUnits })), ' ',
          h('div.chip.good', null, icon('coin', 16), t('res.revenue', { n: r.revenue })),
          h('div.hint', null, r.weeklySales.length === 0 ? t('res.sales_soon') : r.weeklySales.length < SIM_CONFIG.market.salesWeeks ? t('res.sales_week', { n: r.weeklySales.length }) : t('res.sales_done')),
        ),
      ),
      h('div.reviews', null, ...r.reviews.map((rv, i) => h('div.review', { style: { animationDelay: `${0.15 + i * 0.25}s` } }, h('div.o', null, t(`outlet.${rv.outlet}`)), h('div.s', null, fmtNum1(rv.score)), h('div.q', null, `«${tr(rv.quote)}»`)))),
      r.weeklySales.length ? h('div.sales', { title: t('res.sales_chart') }, ...r.weeklySales.map((u) => h('i', { style: { height: `${(u / maxW) * 100}%` } }))) : null,
      h('div.section', null, h('label', null, t('res.why')),
        h('ul.why', null, ...why.map((e) => {
          const causes = e.causes.map((c) => ledger.find((x) => x.id === c)).filter((x) => !!x).slice(0, 2);
          return h(`li.${e.tone > 0 ? 'good' : e.tone < 0 ? 'bad' : 'neutral'}`, null, tr(e.text), ...causes.map((c) => h('span.cause', null, `↳ ${tr(c!.text)}`)));
        }))),
      lesson ? h('p.hint.lesson', { id: 'res-lesson' }, icon('idea', 16), ` ${t('res.lesson', { what: tr(lesson.text) })}`) : null,
      this.productStory(p),
      h('div.actions', null,
        // GT.6: from a product's box, straight to looking after it.
        unlocked(this.state, 'products') && r.weeklySales.length > 0 ? h('button.big-btn.ghost', { id: 'res-products', onclick: () => this.showProducts() }, icon('box', 18), t('products.button')) : null,
        h('button.big-btn.mint', { onclick: () => this.closeModal(true) }, t(tier === 'flop' ? 'res.continue_flop' : 'res.continue'))),
    );
    this.openModal(`results:${projectId}`, card);
    // The score counts up the first time (UI only; respects reduced motion).
    if (!this.countedUp.has(projectId) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.countedUp.add(projectId);
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 900);
        scoreEl.textContent = fmtNum1(Math.round(r.averageScore * (1 - Math.pow(1 - k, 3)) * 10) / 10);
        if (k < 1 && scoreEl.isConnected) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  /** LS.6 (2nd part) / ML.2: the life of a product, from its box on the shelf. */
  private productStory(p: Project): HTMLElement | null {
    const r = p.result!;
    const mems = memoriesOf(this.state, { projectId: p.id });
    const tail = r.tailWeeks ? t(r.salesEnded ? 'story.product.ended' : 'story.product.tail', { weeks: r.weeklySales.length + r.tailWeeks, units: r.totalUnits }) : null;
    if (!mems.length && !tail) return null;
    return h('div.section', null, h('label', null, t('story.product.title')),
      tail ? h('p.hint', null, tail) : null,
      h('ul.memories', null, ...mems.map((m) => this.memoryRow(m))));
  }

  /** F3.8: what players and clients say about the studio, in words (only what stands out). */
  private fameSection(): HTMLElement {
    const f = fameOf(this.state);
    const shown = FAME_ASPECTS.map((a) => ({ a, lvl: fameLevel(f[a]) })).filter((x) => x.lvl !== 'neutral');
    const icons = { quality: 'star', reliability: 'clock', innovation: 'idea' } as const;
    return h('div.section.fame', { id: 'story-fame' }, h('label', null, t('fame.title')),
      shown.length
        ? h('div.row', null, ...shown.map(({ a, lvl }) => h(`span.chip.${lvl === 'great' || lvl === 'good' ? 'good' : 'bad'}`, { dataset: { fame: a, level: lvl }, title: t(`fame.${a}.desc`) }, icon(icons[a], 16), t(`fame.${a}.${lvl}`))))
        : h('div.hint', null, t('fame.none')),
      shown.length ? h('div.hint', null, t('fame.recover_hint')) : null);
  }

  /** E.3: a few lines on who they get on with (not a table). */
  private relationsSection(id: string): HTMLElement {
    const s = this.state;
    const rels = notableRelations(s, id).slice(0, 3);
    const icons: Record<RelationKind, IconName> = { friends: 'heart', good_team: 'team', respect: 'star', mentor: 'book', tension: 'storm', rivals: 'storm' };
    return h('div.section.relations', null, h('div.label', null, t('bond.title')),
      rels.length ? h('ul.rel-list', null, ...rels.map((r) => {
        const o = s.empirians.find((x) => x.id === r.with);
        if (!o) return null;
        const key = r.kind === 'mentor' ? (r.mentorOf ? 'bond.mentor_of' : 'bond.mentored_by') : `bond.${r.kind}`;
        return h(`li.rel.${r.kind}`, { dataset: { rel: r.kind, with: r.with }, title: t(`bond.${r.kind}.desc`) },
          icon(icons[r.kind], 18), this.portraitOf(o.appearance, r.kind === 'tension' || r.kind === 'rivals' ? 'neutral' : 'happy'),
          h('div', null, h('div.t', null, t(key, { name: o.name, skill: r.skill ?? 'tech' })), h('div.hint', null, t(`bond.${r.kind}.desc`))));
      })) : h('div.hint', null, t('bond.none')));
  }

  private memoryIcon(kind: MemoryKind): IconName {
    switch (kind) {
      case 'founded': return 'rocket';
      case 'first_release': case 'record': return 'box';
      case 'first_hit': case 'hit': case 'achievement': return 'star';
      case 'first_flop': case 'farewell': return 'sweat';
      case 'comeback': return 'heart';
      case 'first_hire': case 'hire': return 'team';
      case 'relation': return 'heart';
      case 'reputation': return 'star';
      case 'unlock': return 'star';
      case 'first_contract': case 'money': return 'coin';
      case 'skill_master': return 'idea';
      case 'first_decor': case 'office_moved': return 'decor';
      default: return 'alert';
    }
  }

  private memoryRow(m: Memory): HTMLElement {
    const people = (m.empirianIds ?? []).map((id) => this.state.empirians.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
    const text = m.kind === 'achievement' ? t('memory.achievement', { achievement: t(`ach.${m.text.params?.achievement}.name`), item: t(`item.${m.text.params?.item}.name`) }) : tr(m.text);
    return h(`li.memory.${m.tone > 0 ? 'good' : m.tone < 0 ? 'bad' : 'neutral'}`, { dataset: { memory: m.kind } },
      icon(this.memoryIcon(m.kind), 18),
      h('span.day', null, t('common.day', { day: m.day })),
      h('span.txt', null, text),
      ...people.map((e) => this.portraitOf(e.appearance, 'happy')),
    );
  }

  /** ML.2/ML.3: the studio's story — achievements and memories. Opened from the shelf, trophies, H or the menu. */
  showStory(): void {
    const s = this.state;
    this.tutorial.mark('story');
    const mems = [...s.story.memories].reverse();
    const card = h('div.card.wide.story', null, this.closeBtn(),
      h('h2', null, t('story.title', { company: s.company.name })),
      h('p.sub', null, t('story.sub', { count: s.story.memories.length })),
      unlocked(s, 'studio') ? this.fameSection() : null,
      h('div.section', null, h('label', null, t('story.achievements')),
        h('div.achievements', null, ...ACHIEVEMENTS.map((a) => {
          const day = s.story.achievements[a.id];
          return h(`div.achievement${day !== undefined ? '.on' : ''}`, { dataset: { ach: a.id } },
            icon(day !== undefined ? 'star' : 'box', 22),
            h('div.t', null, day !== undefined ? t(`ach.${a.id}.name`) : t('story.locked')),
            h('div.d', null, day !== undefined ? t('story.earned', { day, item: a.item }) : t(`ach.${a.id}.goal`)),
          );
        }))),
      h('div.section', null, h('label', null, t('story.memories')),
        mems.length ? h('ul.memories', null, ...mems.map((m) => this.memoryRow(m))) : h('p.hint', null, t('story.empty'))),
    );
    this.openModal('story', card);
  }

  // -------------------------------------------------------------- empirian
  /** Character sheet (AW.C): beside the office on desktop, made of real facts. */
  private showEmpirian(id: string): void {
    const s = this.state;
    const e = s.empirians.find((x) => x.id === id);
    if (!e) return;
    this.tutorial.mark('meet');
    const skillIcon: Record<SkillId, IconName> = { tech: 'code', design: 'design', creativity: 'idea', management: 'calendar' };
    const skillRow = (k: SkillId) =>
      h('div.skill', null,
        icon(skillIcon[k], 18),
        h('span.skill-name', null, t(`skill.${k}`)),
        h('span.skill-lvl', null, String(Math.floor(e.skills[k]))),
        h('div.bar.skill-bar', null, h('i', { style: { width: `${Math.round(progressToNext(e, k) * 100)}%` } })),
      );
    const specs = specializations(e);
    const p = getActiveProject(s);
    const working = ['coding', 'designing', 'testing', 'thinking'].includes(e.activity);
    const task = working && p ? t('emp.task.project', { project: projectName(p) }) : working && s.contracts.active ? t('emp.task.contract', { client: s.contracts.active.clientId }) : working && s.support ? t(`support.pill.${s.support.kind}`, { project: getProject(s, s.support.projectId)?.name ?? '' }) : t(`emp.activity.${e.activity}`);
    const since = e.id === s.founderId ? 1 : e.hiredDay ?? 1;
    const mems = memoriesOf(s, { empirianId: e.id }).slice(-5).reverse();
    const big = this.portraitOf(e.appearance, e.energy < 30 ? 'tired' : e.morale >= 60 ? 'happy' : 'neutral');
    big.classList.add('big');
    const card = h('div.card.narrow.sheet', null, this.closeBtn(),
      h('div.row.sheet-head', { style: { flexWrap: 'nowrap' } }, big,
        h('div', null,
          h('h2', null, e.name, e.nickname ? h('span.nick', null, ` «${e.nickname}»`) : null),
          h('div.row', null,
            e.trait ? h('span.chip.trait', { title: t(`trait.${e.trait}.desc`) }, t(`trait.${e.trait}`)) : h('span.chip.trait', null, t('team.founder')),
            h(`span.chip.${e.energy < 30 ? 'bad' : 'good'}`, null, icon('sweat', 16), t('emp.energy', { n: e.energy })),
            h('span.chip', null, icon('heart', 16), t('emp.morale', { n: e.morale })),
          ),
        ),
      ),
      h('p.hint.task', null, h('b', null, `${t('emp.task')}: `), task, s.empirians.length >= 2 ? h('span.chip.small', { title: t(`role.${e.role ?? 'auto'}.desc`), style: { marginLeft: '6px' } }, `${t('roles.title')}: ${t(`role.${e.role ?? 'auto'}`)}`) : null),
      h('p.hint', null, t('emp.since', { day: since, days: Math.max(0, s.day - since) })),
      h('div.bio', null, ...biography(s, e).map((b) => h('p', null, tr(b)))),
      e.trait ? h('p.hint', null, t(`trait.${e.trait}.desc`)) : null,
      h('div.section', null, h('div.label', null, t('emp.skills')), ...SKILLS.map(skillRow), h('div.hint', null, t('emp.learning_hint'))),
      h('div.section', null, h('div.label', null, t('emp.specialties')),
        specs.length ? h('div.row', null, ...specs.map((sp) => h('span.chip.good', null, icon('star', 16), t('emp.specialty', { topic: sp.topicId, bonus: sp.bonus })))) : h('div.hint', null, t('emp.no_specialty'))),
      s.empirians.length >= 2 ? this.relationsSection(e.id) : null,
      h('div.section', null, h('div.label', null, t('emp.story')),
        mems.length ? h('ul.memories', null, ...mems.map((m) => this.memoryRow(m))) : h('div.hint', null, t('emp.no_memories'))),
      h('div.row.between', null,
        e.salary !== undefined ? h('span.chip', null, icon('coin', 16), t('team.salary_week', { salary: e.salary })) : h('span'),
        h('div.row', null,
          h('button.big-btn.ghost.small', { id: 'edit-empirian', onclick: () => this.showEditor(e.id) }, t('emp.edit')),
          e.salary !== undefined ? h('button.big-btn.coral.small', { id: 'fire-btn', onclick: () => {
            if (!confirm(t('team.fire_confirm', { name: e.name, severance: e.salary! * SIM_CONFIG.team.severanceWeeks }))) return;
            const r = this.game.dispatch({ type: 'fire', empirianId: e.id });
            if (!r.ok) return this.toast(t(`error.${r.error}`), 'alert');
            this.closeModal(true);
          } }, t('team.fire')) : null,
        ),
      ),
    );
    this.openModal('empirian', card, { pause: false, cls: 'desk-side' });
  }

  /** Who does what (AW.E.2): a role per person, or let the project decide. */
  private rolesSection(): HTMLElement {
    const s = this.state;
    const roles: Role[] = ['auto', 'design', 'code', 'test'];
    const p = s.activeProjectId ? getProject(s, s.activeProjectId) : null;
    const total = p ? p.workDone.tech + p.workDone.design : 0;
    const allAuto = s.empirians.every((e) => (e.role ?? 'auto') === 'auto');
    // Re-render just this section in place (no modal flash, the game stays paused).
    const refresh = () => el.replaceWith(this.rolesSection());
    const el: HTMLElement = h('div.section.roles', null,
      h('div.row.between', null, h('div.label', null, t('roles.title')),
        h('button.big-btn.ghost.small', { id: 'roles-auto', disabled: allAuto, onclick: () => {
          for (const e of s.empirians) this.game.dispatch({ type: 'set_role', empirianId: e.id, role: 'auto' });
          refresh();
        } }, t('roles.all_auto'))),
      h('p.hint', null, t('roles.hint')),
      ...s.empirians.map((e) => h('div.role-row', { dataset: { roleOf: e.id } },
        h('span.t', null, e.name),
        h('div.seg', null, ...roles.map((r) => h('button', { class: (e.role ?? 'auto') === r ? 'on' : '', dataset: { role: r }, title: t(`role.${r}.desc`), onclick: () => {
          const res = this.game.dispatch({ type: 'set_role', empirianId: e.id, role: r });
          if (!res.ok) return this.toast(t(`error.${res.error}`), 'alert');
          refresh();
        } }, t(`role.${r}`)))))),
      p && total >= SIM_CONFIG.roles.mixMinWork && p.phase !== 'polish' && p.phase !== 'released' ? h('p.hint', { id: 'roles-mix' }, t(mixPenalty(p) > 0 ? 'roles.mix_off' : 'roles.mix_ok', { code: Math.round((p.workDone.tech / total) * 100), want: Math.round(p.focus * 100) })) : null,
    );
    return el;
  }

  // ---------------------------------------------------------------- team (GT.1)
  showTeam(): void {
    const s = this.state;
    this.tutorial.mark('hiring');
    const free = freeWorkstations(s).length;
    const staff = employees(s);
    const full = staff.length >= maxEmployees(s);
    const skillMini = (sk: Record<SkillId, number>) => h('div.mini-skills', null,
      ...(['tech', 'design', 'creativity', 'management'] as SkillId[]).map((k) => h('span.mini', { title: t(`skill.${k}`) }, icon(({ tech: 'code', design: 'design', creativity: 'idea', management: 'calendar' } as Record<SkillId, IconName>)[k], 14), String(Math.floor(sk[k])))));
    const payroll = staff.reduce((a, e) => a + (e.salary ?? 0), 0);
    const card = h('div.card.wide.team', null, this.closeBtn(),
      h('h2', null, t('team.title')),
      h('p.sub', null, staff.length ? t('team.sub_payroll', { count: staff.length + 1, payroll }) : t('team.sub_solo')),
      h('div.team-row', null, ...s.empirians.map((e) => h('button.member', { dataset: { member: e.id }, onclick: () => this.showEmpirian(e.id) },
        this.portraitOf(e.appearance, e.morale >= 60 ? 'happy' : 'neutral'),
        h('div.t', null, e.name),
        h('div.d', null, e.id === s.founderId ? t('team.founder') : t(`trait.${e.trait}`)),
      ))),
      s.empirians.length >= 2 ? this.rolesSection() : null,
      h('div.section', null, h('div.label', null, t('team.candidates')),
        full ? h('p.hint', null, t('team.full')) :
        !s.hiring.candidates.length ? h('p.hint', null, t('team.no_candidates', { day: s.hiring.nextRefreshDay })) :
        h('div.offers', null, ...s.hiring.candidates.map((c) => {
          const reason = free === 0 ? 'no_free_desk' : s.company.money < c.salary ? 'not_enough_money' : null;
          return h('div.offer.candidate', { dataset: { candidate: c.id } },
            h('div.row', { style: { flexWrap: 'nowrap', alignItems: 'center' } }, this.portraitOf(c.appearance, 'happy'),
              h('div', { style: { flex: '1' } }, h('div.t', null, c.name), skillMini(c.baseSkills))),
            h('div.row', null,
              h('span.chip.trait', { title: t(`trait.${c.trait}.desc`) }, t(`trait.${c.trait}`)),
              h('span.chip', null, icon('coin', 16), t('team.salary_week', { salary: c.salary })),
            ),
            h('div.hint', null, t(`trait.${c.trait}.desc`)),
            h('div.row.between', null,
              h('span.hint', null, t('team.expires', { day: c.expiresDay })),
              h('button.big-btn.mint.small', { dataset: { hire: c.id }, disabled: !!reason, title: reason ? t(`error.${reason}`) : '', onclick: () => {
                const r = this.game.dispatch({ type: 'hire', candidateId: c.id });
                if (!r.ok) return this.toast(t(`error.${r.error}`), 'alert');
                this.closeModal(true);
              } }, t('team.hire')),
            ),
          );
        }))),
      !full && free === 0 ? h('div.row.between.desk-hint', null, h('span.hint', null, t('team.need_desk')),
        h('button.big-btn.ghost.small', { id: 'team-buy-desk', onclick: () => { this.closeModal(); this.decor.open(); } }, icon('decor', 16), ` ${t('team.go_decor')}`)) : null,
      NEXT_SIZE[s.office.size ?? 'room'] && unlocked(s, 'expansion') && (full || free === 0) ? h('div.row.between.desk-hint', null, h('span.hint', null, t('team.expand_hint')),
        h('button.big-btn.ghost.small', { id: 'team-expand', onclick: () => this.showExpand() }, t('expand.button'))) : null,
    );
    this.openModal('team', card, { cls: 'desk-side' });
  }

  // ---------------------------------------------------------------- work
  showWorkChooser(): void {
    const s = this.state;
    // Before clients know the studio (D-062), there's only one kind of work: your own game.
    if (!unlocked(s, 'contracts')) return this.showNewProject();
    const card = h('div.card.narrow', null, this.closeBtn(),
      h('h2', null, t('work.title')),
      h('p.sub', null, t('work.sub')),
      h('div.tiles.work-tiles', null,
        h('button.tile', { id: 'choose-game', onclick: () => this.showNewProject() }, h('div.t', null, icon('rocket', 20), t('work.game')), h('div.d', null, t('work.game_desc'))),
        h('button.tile', { id: 'choose-contracts', onclick: () => this.showContracts() }, h('div.t', null, icon('coin', 20), t('work.contracts'), s.contracts.offers.length ? ` (${s.contracts.offers.length})` : ''), h('div.d', null, t('work.contracts_desc'))),
      ),
    );
    this.openModal('work', card);
  }

  showContracts(): void {
    const s = this.state;
    const offers = s.contracts.offers;
    const card = h('div.card', null, this.closeBtn(),
      h('h2', null, t('contracts.title')),
      h('p.sub', null, t('contracts.sub')),
      offers.length
        ? h('div.offers', null, ...offers.map((o) => {
            const est = estimateDays(s, o.work, o.focus);
            const risky = est > o.days * 0.9;
            return h('div.offer', { dataset: { offer: o.id } },
              h('div.t', null, t('contracts.offer', { client: o.clientId, kind: o.kind })),
              // D.4: the client's history with the studio, in words.
              ((r) => r.jobs > 0 ? h(`span.chip.small.${r.trust >= 0 ? 'good' : 'warn'}`, { dataset: { clientRel: o.clientId } }, icon(r.trust >= 0 ? 'heart' : 'sweat', 14), t(r.jobs >= SIM_CONFIG.ambition.loyalJobs && r.trust > 0 ? 'client.loyal' : r.trust >= 0 ? 'client.known' : 'client.wary')) : null)(clientOf(s, o.clientId)),
              h('div.row', null,
                h('span.chip.good', null, icon('coin', 16), t('contracts.pay', { pay: o.payment })),
                h('span.chip', null, icon('calendar', 16), t('contracts.days', { days: o.days })),
                h(`span.chip${risky ? '.bad' : ''}`, null, icon('clock', 16), t('contracts.estimate', { days: est })),
                risky ? h('span.chip.warn', null, t('contracts.risky')) : null,
              ),
              h('div.row.between', null,
                h('span.hint', null, t('contracts.expires', { day: o.expiresDay })),
                h('button.big-btn.mint.small', { dataset: { accept: o.id }, onclick: () => {
                  const r = this.game.dispatch({ type: 'accept_contract', offerId: o.id });
                  if (!r.ok) return this.toast(t(`error.${r.error}`), 'alert');
                  this.closeModal();
                  this.setSpeed(this.resumeSpeed || 1);
                  this.toast(t('toast.contract_accepted'), 'rocket');
                } }, t('contracts.accept')),
              ),
            );
          }))
        : h('p.hint', null, t('contracts.none')),
    );
    this.openModal('contracts', card, { cls: 'desk-side' });
  }

  // ------------------------------------------------------------ GT.6 products
  /** The studio's games after launch: how each one is doing, and looking after them. */
  showProducts(): void {
    const s = this.state;
    const rel = s.projects.filter((p) => p.result).sort((a, b) => b.result!.releasedDay - a.result!.releasedDay);
    const job = s.support;
    const row = (p: Project) => {
      const r = p.result!;
      const st = productStatus(p);
      const sup = supportOf(p);
      const bugs = p.bugs.hidden + p.bugs.known;
      const patchErr = patchBlock(s, p);
      const updErr = updateBlock(s, p);
      const working = job?.projectId === p.id;
      const btn = (kind: 'patch' | 'update', err: string | null) => {
        const reason = err && err !== 'busy' ? t(`support.block.${err}`) : null;
        if (reason && (err === 'no_bugs' || err === 'updated_enough' || err === 'no_audience' || err === 'too_old')) return h('span.hint', { dataset: { block: `${kind}:${err}` } }, reason);
        return h(`button.big-btn.small.${kind === 'patch' ? 'ghost' : 'mint'}`, {
          dataset: { support: kind, project: p.id }, disabled: !!err,
          title: err ? t(`support.block.${err}`) : t(`support.${kind}.hint`),
          onclick: () => {
            const res = this.game.dispatch({ type: 'start_support', projectId: p.id, kind });
            if (!res.ok) return this.toast(t(`error.${res.error}`));
            this.services.save();
            this.closeModal(true);
            this.toast(t(`support.started.${kind}`, { project: projectName(p) }), kind === 'patch' ? 'bug' : 'idea');
          },
        }, t(`support.${kind}.button`, { days: supportDays(s, p, kind) }));
      };
      return h('li.product', { dataset: { product: p.id, status: st } },
        h('div.row', { style: { justifyContent: 'space-between', flexWrap: 'nowrap' } },
          h('div', null, h('div.name', null, projectName(p)), h('div.hint', null, t('products.line', { topic: t(`topic.${p.topicId}.name`), day: r.releasedDay }))),
          h('div.score-mini', null, fmtNum1(r.averageScore)),
        ),
        h('div.row', null,
          h(`span.chip.status-${st}`, null, t(`products.status.${st}`)),
          h('span.chip', null, icon('box', 16), t('res.units', { n: r.totalUnits })),
          h('span.chip.good', null, icon('coin', 16), t('res.revenue', { n: r.revenue })),
          bugs ? h('span.chip.bad', null, icon('bug', 16), t('products.bugs', { count: bugs })) : null,
          sup.patches ? h('span.chip', null, t('products.patches', { count: sup.patches })) : null,
          sup.updates ? h('span.chip', null, t('products.updates', { count: sup.updates })) : null,
        ),
        working ? h('p.hint', null, icon('code', 16), ` ${t(`support.working.${job!.kind}`, { pct: Math.min(1, job!.done / job!.work) })}`) : h('div.actions.left', null, btn('patch', patchErr), btn('update', updErr)),
      );
    };
    const card = h('div.card.wide.products', { id: 'products-card' }, this.closeBtn(),
      h('h2', null, t('products.title')),
      h('p.sub', null, t('products.sub')),
      job ? h('div.row', null, h('span.hint', null, t('support.busy_hint')), h('button.link', { id: 'support-cancel', onclick: () => { this.game.dispatch({ type: 'cancel_support' }); this.showProducts(); } }, t('support.cancel'))) : null,
      rel.length ? h('ul.products-list', null, ...rel.map(row)) : h('p.hint', null, t('products.none')),
    );
    this.openModal('products', card);
  }

  private showContract(): void {
    const s = this.state;
    const c = s.contracts.active;
    if (!c) return;
    const card = h('div.card.narrow', null, this.closeBtn(),
      h('h2', null, t('contract.title', { client: c.clientId })),
      h('p.sub', null, t('contracts.offer', { client: c.clientId, kind: c.kind })),
      h('div.row', null,
        h('span.chip', null, t('contract.progress', { pct: Math.min(1, c.done / c.work) })),
        h('span.chip', null, icon('calendar', 16), t('contract.due', { day: c.dueDay })),
        h('span.chip.good', null, icon('coin', 16), t('contracts.pay', { pay: c.payment })),
      ),
      s.day > c.dueDay ? h('p.hint', null, t('contract.late')) : null,
      h('div.actions', null,
        h('button.big-btn.coral', { onclick: () => { this.game.dispatch({ type: 'cancel_contract' }); this.closeModal(true); } }, t('contract.cancel')),
        h('button.big-btn.mint', { onclick: () => this.closeModal(true) }, t('contract.keep')),
      ),
    );
    this.openModal('contract', card, { cls: 'desk-side' });
  }

  // ----------------------------------------------------------- Empires Daily
  private unreadNews(): number {
    const w = this.state.world;
    const idx = w.news.findIndex((n) => n.id === w.lastReadNewsId);
    return idx === -1 ? w.news.length : idx;
  }

  showDaily(): void {
    const s = this.state;
    const news = s.world.news;
    const card = h('div.card.daily', null, this.closeBtn(),
      h('h2.masthead', null, t('daily.title')),
      h('p.sub', null, t('daily.sub', { day: s.day })),
      news.length
        ? h('div.news-list', null, ...news.slice(0, 20).map((n) =>
            h(`article.news.${n.importance}`, null,
              h('div.news-day', null, t('daily.day', { day: n.day })),
              h('h3', null, t(`news.${n.kind}.title`, n.params)),
              h('p', null, t(`news.${n.kind}.body`, n.params)))))
        : h('p.hint', null, t('daily.empty')),
    );
    this.game.dispatch({ type: 'mark_news_read' });
    this.openModal('daily', card, { cls: 'desk-side' });
  }

  // ------------------------------------------------------------------- menu
  showMenu(): void {
    const cam = this.scene.getCameraMode();
    const card = h('div.card.narrow', null, this.closeBtn(),
      h('h2', null, t('menu.title')),
      h('p.sub', null, t('menu.sub')),
      h('div.actions', { style: { justifyContent: 'stretch', flexDirection: 'column' } },
        h('button.big-btn.mint', { onclick: () => { this.services.save(); this.toast(t('toast.saved'), 'check'); this.closeModal(true); } }, t('menu.save')),
        h('button.big-btn.ghost', { id: 'menu-help', onclick: () => this.showHelp() }, t('menu.help')),
        h('button.big-btn.ghost', { id: 'menu-story', onclick: () => this.showStory() }, t('menu.story')),
        h('button.big-btn.ghost', { onclick: () => this.services.exportSave() }, t('menu.export')),
        h('button.big-btn.ghost', { onclick: () => void this.services.importSave() }, t('menu.import')),
        h('button.big-btn.ghost', { onclick: () => { this.services.setCamera(cam === 'iso' ? 'dim' : 'iso'); this.showMenu(); } }, t('menu.camera', { mode: t(`menu.camera.${cam}`) })),
        h('button.big-btn.ghost', { id: 'menu-language', onclick: () => { const next: Locale = getLocale() === 'es' ? 'en' : 'es'; this.services.setLocale(next); setLocale(next); this.renderHud(true); this.showMenu(); } }, t('menu.language', { lang: LOCALE_NAMES[getLocale()] })),
        h('button.big-btn.coral', { onclick: () => { if (confirm(t('menu.new_game_confirm'))) this.services.newGame(); } }, t('menu.new_game')),
      ),
      this.soundSection(),
      h('p.hint.version', { id: 'menu-version' }, t('menu.version', { version: this.build.version, commit: this.build.commit, date: this.build.date })),
      h('p.hint.shortcuts', null, t('menu.shortcuts')),
      this.debug ? h('p.hint.version', null, t('menu.debug_sandbox')) : null,
    );
    this.openModal('menu', card);
  }

  /** Sound settings (0.18.0): general, effects, ambience and mute. Saved in this browser. */
  private soundSection(): HTMLElement | null {
    const snd = this.services.sound;
    if (!snd) return null;
    const p = snd.prefs;
    const slider = (vol: keyof Omit<AudioPrefs, 'muted'>) =>
      h('div.sound-row', null, h('span', null, t(`sound.${vol}`)),
        h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(p[vol] * 100)), id: `sound-${vol}`, 'aria-label': t(`sound.${vol}`),
          oninput: (ev: Event) => snd.setPrefs({ [vol]: Number((ev.target as HTMLInputElement).value) / 100 }),
          onchange: () => this.sfx('confirm') }));
    return h('div.section.sound', { id: 'menu-sound' }, h('label', null, t('sound.title')),
      slider('master'), slider('effects'), slider('ambience'),
      h('div.sound-row', null, h('span', null, t('sound.mute')),
        h('input', { type: 'checkbox', id: 'sound-mute', checked: p.muted, onchange: (ev: Event) => { snd.setPrefs({ muted: (ev.target as HTMLInputElement).checked }); if (!snd.prefs.muted) this.sfx('confirm'); } })),
      snd.ready || !('AudioContext' in window) ? null : h('p.hint', null, t('sound.tap_to_start')));
  }

  /** A bigger studio (AW.E.1): what it gives, what it costs. */
  showExpand(): void {
    const s = this.state;
    const next = NEXT_SIZE[s.office.size ?? 'room'];
    if (!next) return;
    const spec = OFFICE_SIZES[next];
    const cur = OFFICE_SIZES[s.office.size ?? 'room'];
    const card = h('div.card.narrow.expand', null, this.closeBtn(),
      h('h2', null, t(`expand.title.${next}`)),
      h('p.sub', null, t(`expand.sub.${next}`)),
      h('ul.expand-list', null,
        h('li', null, t('expand.space', { w: spec.w, d: spec.d, cw: cur.w, cd: cur.d })),
        h('li', null, t('expand.people', { n: spec.maxEmployees + 1 })),
        h('li', null, t('expand.keep')),
        h('li', null, t('expand.rent', { rent: spec.rent })),
      ),
      h('div.actions', null,
        h('button.big-btn.ghost', { onclick: () => this.closeModal(true) }, t('expand.later')),
        h('button.big-btn.mint', { id: 'expand-confirm', disabled: s.company.money < spec.price, title: s.company.money < spec.price ? t('error.not_enough_money') : '', onclick: () => {
          const r = this.game.dispatch({ type: 'expand_office' });
          if (!r.ok) return this.toast(t(`error.${r.error}`), 'alert');
          this.closeModal(true);
          this.services.save();
          this.toast(t('expand.done'), 'star');
        } }, t('expand.confirm', { price: spec.price })),
      ),
    );
    this.openModal('expand', card);
  }

  /** Help (AW.A): short guide by topic, keyboard shortcuts on desktop, restart the tutorial. */
  showHelp(): void {
    const s = this.state;
    const desk = matchMedia('(pointer: fine)').matches;
    const topic = (k: string, ic: IconName) => h('div.help-topic', null, h('div.t', null, icon(ic, 18), t(`help.${k}.title`)), h('div.d', null, t(`help.${k}.text`)));
    const card = h('div.card.wide.help', null, this.closeBtn(),
      h('h2', null, t('help.title')),
      h('p.sub', null, t('help.sub')),
      h('div.help-grid', null,
        topic('games', 'rocket'), topic('time', 'clock'), topic('energy', 'sweat'), topic('decisions', 'idea'),
        topic('sales', 'coin'), topic('office', 'decor'), topic('team', 'team'), topic('relations', 'heart'), topic('debt', 'code'), topic('fame', 'star'), topic('profiles', 'rocket'), topic('story', 'star'),
      ),
      desk ? h('p.hint', null, t('menu.shortcuts')) : null,
      h('div.actions', null,
        h('button.big-btn.ghost', { id: 'help-restart-tutorial', onclick: () => {
          this.game.dispatch({ type: 'tutorial', action: 'restart' });
          this.closeModal(true);
          this.toast(t('tut.restarted'), 'star');
        } }, s.tutorial.active ? t('help.tutorial_restart_active') : t('help.tutorial_restart')),
        h('button.big-btn.mint', { onclick: () => this.closeModal(true) }, t('common.close')),
      ),
    );
    this.openModal('help', card);
  }

  isModalOpen(): boolean {
    return !!this.modal;
  }
}

function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}
