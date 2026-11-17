import type { Speed } from '../sim/config';
import type { SimEvent } from '../sim/core/events';
import { PROJECT_LIMITS } from '../sim/commands';
import { SIM_CONFIG } from '../sim/config';
import { estimatePlan, estimateProgress, teamSpeedFactor } from '../sim/estimates';
import { employees, freeWorkstations, hiringUnlocked, maxEmployees } from '../sim/systems/team';
import { NEXT_SIZE, OFFICE_SIZES } from '../content/officeSizes';
import { ACHIEVEMENTS, memoriesOf } from '../sim/systems/story';
import { biography } from '../sim/systems/biography';
import { FEATURE_CFG, featureLock } from '../sim/systems/features';
import { FEATURE_SLOTS, FEATURES, getFeature } from '../content/features';
import type { Game } from '../sim/game';
import type { Appearance, GameState, Memory, MemoryKind, PendingDecision, Project, ProjectSize, SkillId } from '../sim/model/state';
import { progressToNext, SKILLS, specializations } from '../sim/systems/progression';
import { getActiveProject, getFounder, getProject } from '../sim/state';
import { productionProgress } from '../sim/systems/project';
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
import { estimateDays } from '../sim/systems/contracts';
import { fmtMoney, fmtNum1, fmtPrice, getLocale, LOCALE_NAMES, setLocale, t, tr, type Locale } from '../i18n/i18n';

export interface UIServices {
  save(): void;
  exportSave(): void;
  importSave(): Promise<void>;
  newGame(): void;
  setCamera(mode: 'iso' | 'dim'): void;
  setLocale(l: Locale): void;
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
    this.decor = new DecorUI(root, scene, {
      state: () => this.game.state,
      dispatch: (cmd) => this.game.dispatch(cmd),
      toast: (text, ic) => this.toast(text, ic),
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
    else if (k === 'n' || k === 'N') { this.showDaily(); used(); }
    else if (k === 'd' || k === 'D') { this.decor.open(); used(); }
    else if (k === 'm' || k === 'M' || k === 'Escape') { this.showMenu(); used(); }
    else if (k === 'c' || k === 'C') { if (s.contracts.active) this.showContract(); else if (!getActiveProject(s)) this.showContracts(); used(); }
    else if (k === 'p' || k === 'P') {
      if (getActiveProject(s)) this.showProjectPanel();
      else if (!s.contracts.active) this.showNewProject();
      used();
    }
    else if (k === 'f' || k === 'F') { const f = getFounder(s); this.showEmpirian(f.id); used(); }
    else if (k === 'h' || k === 'H') { this.showStory(); used(); }
    else if (k === '?' || k === 'F1') { this.showHelp(); used(); }
    else if ((k === 't' || k === 'T') && (hiringUnlocked(s) || s.empirians.length > 1)) { this.showTeam(); used(); }
  }

  // ------------------------------------------------------------------- HUD
  private hudRefs: { day?: HTMLElement; money?: HTMLElement; bar?: HTMLElement; bugs?: HTMLElement; days?: HTMLElement; phase?: HTMLElement } = {};

  renderHud(force = false): void {
    const s = this.state;
    const p = getActiveProject(s);
    // Structure is rebuilt only when it changes; values are patched in place so
    // buttons are never replaced under the player's finger.
    const key = JSON.stringify([this.game.clock.speed, p?.id, p?.phase, s.setupComplete, !!this.modal, s.projects.length, this.unreadNews(), s.contracts.active?.id, s.contracts.offers.length, s.hiring.candidates.length, s.empirians.length, hiringUnlocked(s)]);
    if (force || key !== this.lastHudKey) {
      this.lastHudKey = key;
      this.buildHud();
    }
    const r = this.hudRefs;
    if (r.day) r.day.textContent = t('common.day', { day: s.day });
    if (r.money) {
      r.money.textContent = fmtMoney(s.company.money);
      r.money.classList.toggle('neg', s.company.money < 0);
    }
    const ct = s.contracts.active;
    if (ct && !p) {
      if (r.bar) r.bar.style.width = `${Math.round(Math.min(1, ct.done / ct.work) * 100)}%`;
      if (r.days) r.days.textContent = t('common.days_short', { n: ct.dueDay - s.day });
    }
    if (p) {
      const prog = productionProgress(p);
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
      ),
      h('div.hud-tr', null,
        h('div.pill.speeds', null, speedBtn(0, icon('pause', 18)), speedBtn(1, '1x'), speedBtn(2, '2x'), speedBtn(4, '4x'), speedBtn(8, '8x')),
        h('button.icon-btn.badge-host', { 'aria-label': t('daily.button'), title: t('kbd.tip', { label: t('daily.button'), key: 'N' }), id: 'hud-news', onclick: () => this.showDaily() }, icon('news'), this.unreadNews() ? h('span.badge', null, String(Math.min(9, this.unreadNews()))) : null),
        h('button.icon-btn', { 'aria-label': t('decor.button'), title: t('kbd.tip', { label: t('decor.button'), key: 'D' }), id: 'hud-decor', onclick: () => this.decor.open() }, icon('decor')),
        hiringUnlocked(s) || s.empirians.length > 1 ? h('button.icon-btn.badge-host', { 'aria-label': t('team.button'), title: t('kbd.tip', { label: t('team.button'), key: 'T' }), id: 'hud-team', onclick: () => this.showTeam() }, icon('team'), s.hiring.candidates.length && s.empirians.length - 1 < maxEmployees(s) ? h('span.badge', null, String(s.hiring.candidates.length)) : null) : null,
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
    } else if (!this.modal) {
      bottom.append(
        h('button.big-btn.mint', { id: 'hud-new-project', onclick: () => this.showNewProject() }, s.projects.length ? t('hud.new_project') : t('hud.first_project')),
        h('button.big-btn.ghost.badge-host', { id: 'hud-contracts', onclick: () => this.showContracts() }, t('work.contracts'), s.contracts.offers.length ? h('span.badge', null, String(s.contracts.offers.length)) : null),
      );
    }
    this.hud.append(bottom);
  }

  /** Per-frame: speech bubble position + diagnostics. */
  frame(fps: number): void {
    this.tutorial.frame();
    const s = this.state;
    const founder = s.setupComplete ? getFounder(s) : null;
    const want = founder && !this.modal && !this.decor.active && !this.tutorial.visible && !getActiveProject(s) && !s.contracts.active && founder.activity !== 'celebrating' ? (!s.projects.length ? t('speech.first') : s.contracts.offers.length ? t('speech.idle_options') : t('speech.again')) : null;
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
        case 'project_released':
          this.services.save();
          setTimeout(() => this.showResults(e.projectId), 1800);
          break;
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
          this.toast(t('toast.achievement', { achievement: t(`ach.${e.achievementId}.name`), item: t(`item.${e.itemId}.name`) }), 'star');
          this.services.save();
          break;
        case 'memory': {
          const m = this.state.story.memories.find((x) => x.id === e.memoryId);
          if (m && !['decision', 'achievement', 'founded', 'hire', 'first_hire', 'farewell'].includes(m.kind)) this.toast(t('toast.memory'), 'heart');
          break;
        }
        case 'candidates_arrived':
          this.toast(t('toast.candidates', { count: e.count }), 'team');
          break;
        case 'hired': {
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
    this.closeModal();
    if (opts.pause !== false) {
      if (this.game.clock.speed !== 0) this.resumeSpeed = this.game.clock.speed;
      this.game.clock.setSpeed(0);
    }
    this.modalKind = kind;
    this.modal = h(`div.backdrop${opts.cls ? '.' + opts.cls : ''}`, {
      onpointerdown: (ev: Event) => {
        if (ev.target === this.modal && kind !== 'decision' && kind !== 'creator') this.closeModal(true);
      },
    }, card);
    this.root.append(this.modal);
    this.renderHud(true);
  }

  closeModal(resume = false): void {
    if (!this.modal) return;
    // The reviews step counts once the player has seen (and closed) the results.
    if (this.modalKind.startsWith('results:')) this.tutorial.mark('reviews');
    this.modal.remove();
    this.modal = null;
    this.modalKind = '';
    if (resume && this.state.setupComplete && !this.state.pendingDecision) this.game.clock.setSpeed(this.resumeSpeed);
    this.renderHud(true);
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
      const extra = plan.features.reduce((a, id) => a + (getFeature(id)?.work ?? 0), 0) + (plan.prototype ? FEATURE_CFG.prototypeWork : 0);
      const e = estimatePlan(founder, plan.size, plan.focus, plan.budget, plan.days, teamSpeedFactor(s, plan.focus) / (1 + extra));
      clear(est);
      const verdict = { too_short: 'bad', tight: 'warn', ok: 'good', generous: 'warn' }[e.verdict];
      est.append(
        h('span.chip', null, icon('clock', 16), t('np.production_est', { min: e.productionDays[0], max: e.productionDays[1] })),
        h(`span.chip.${verdict}`, null, t(`np.verdict.${e.verdict}`)),
      );
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
      for (const f of FEATURES) {
        const lock = featureLock(s, f, plan.size);
        const on = plan.features.includes(f.id);
        const fit = f.fit[plan.topicId] ?? 0;
        const chips = [
          t(f.work <= 0.2 ? 'fchip.work_low' : f.work <= 0.3 ? 'fchip.work_mid' : 'fchip.work_high'),
          f.risk >= 0.3 ? t('fchip.risk_high') : f.risk >= 0.2 ? t('fchip.risk') : null,
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
      featureBox.append(grid, h('div.hint', null, t('np.features_hint')),
        h('label.check', null,
          h('input', { type: 'checkbox', id: 'np-prototype', checked: plan.prototype, onchange: (e: Event) => { plan.prototype = (e.target as HTMLInputElement).checked; refresh(); } }),
          ` ${t('np.prototype', { cost: FEATURE_CFG.prototypeCost })}`),
        h('div.hint', null, t('np.prototype_hint')));
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
          h('div.grid2', null,
            h('div.section', null, h('label', null, t('np.size')), seg([['small', t('np.size.small')], ['medium', t('np.size.medium')]], () => plan.size, (v) => { plan.size = v as ProjectSize; drawFeatures(); })),
            h('div.section', null, h('label', null, t('np.price')), seg(PROJECT_LIMITS.prices.map((p) => [String(p), fmtPrice(p)]), () => String(plan.price), (v) => (plan.price = Number(v)))),
          ),
        ),
        h('div.col', null,
          h('div.section', null, h('label', null, t('np.focus')),
            h('input', { type: 'range', min: 0, max: 100, value: plan.focus * 100, 'aria-label': t('np.focus'), oninput: (e: Event) => { plan.focus = Number((e.target as HTMLInputElement).value) / 100; refresh(); } }),
            h('div.hint', null, focusLbl, ` · ${t('np.focus_hint')}`)),
          h('div.section', null, h('label', null, t('np.budget')),
            h('input', { type: 'range', min: 0, max: maxBudget, step: 100, value: plan.budget, 'aria-label': t('np.budget'), oninput: (e: Event) => { plan.budget = Number((e.target as HTMLInputElement).value); refresh(); } }),
            h('div.hint', null, budgetLbl, ` · ${t('np.budget_hint')}`)),
          h('div.section', null, h('label', null, t('np.deadline')),
            h('input', { type: 'range', min: PROJECT_LIMITS.minDays, max: PROJECT_LIMITS.maxDays, step: 7, value: plan.days, 'aria-label': t('np.deadline'), oninput: (e: Event) => { plan.days = Number((e.target as HTMLInputElement).value); refresh(); } }),
            h('div.hint', null, daysLbl)),
          est,
          h('div.section', null, featureBox),
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
        h(`span.chip.${founder.energy < 30 ? 'bad' : 'good'}`, null, icon('sweat', 16), t('pp.energy', { n: founder.energy })),
        h('span.chip', null, icon('heart', 16), t('pp.hype', { n: p.hype })),
        h('span.chip', null, icon('coin', 16), t('pp.spent', { spent: p.spent, budget: p.budget })),
      ),
      h('div.cols', null, h('div.col', null,
      h('div.section', null, h('label', null, t('pp.pace')),
        seg([['relaxed', t('pp.pace.relaxed')], ['normal', t('pp.pace.normal')], ['crunch', t('pp.pace.crunch')]], p.pace, (v) => send({ type: 'adjust_project', pace: v as Project['pace'] })),
        h('div.hint', null, t('pp.pace_hint'))),
      h('div.section', null, h('label', null, t('pp.testing')),
        seg([['0.2', t('pp.testing.low')], ['0.6', t('pp.testing.mid')], ['0.9', t('pp.testing.high')]], String(p.testFocus), (v) => send({ type: 'adjust_project', testFocus: Number(v) }))),
      ), h('div.col', null,
      h('div.grid2', null,
        h('div.section', null, h('label', null, t('pp.deadline')),
          h('div.stepper', null,
            h('button', { onclick: () => send({ type: 'adjust_project', deadlineDay: p.deadlineDay - 7 }) }, '−7'),
            h('span', null, t('common.day', { day: p.deadlineDay })),
            h('button', { onclick: () => send({ type: 'adjust_project', deadlineDay: p.deadlineDay + 7 }) }, '+7')),
          h('div.hint', null, t(p.deadlineDay > p.originalDeadlineDay ? 'pp.deadline_late' : 'pp.deadline_announced'))),
        h('div.section', null, h('label', null, t('pp.budget')),
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
    const ledger = this.state.ledger;
    const why = r.explanation.map((id) => ledger.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
    const maxW = Math.max(1, ...r.weeklySales);
    const verdict = t(r.averageScore >= 8 ? 'res.verdict.hit' : r.averageScore >= 6.5 ? 'res.verdict.good' : r.averageScore >= 5 ? 'res.verdict.meh' : 'res.verdict.lesson');
    const card = h('div.card.wide', null, this.closeBtn(),
      h('h2', null, projectName(p)),
      h('p.sub', null, t('res.sub', { verdict, day: r.releasedDay, price: r.price })),
      h('div.row', null,
        h('div.score-big', null, fmtNum1(r.averageScore)),
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
      this.productStory(p),
      h('div.actions', null, h('button.big-btn.mint', { onclick: () => this.closeModal(true) }, t('res.continue'))),
    );
    this.openModal(`results:${projectId}`, card);
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

  private memoryIcon(kind: MemoryKind): IconName {
    switch (kind) {
      case 'founded': return 'rocket';
      case 'first_release': case 'record': return 'box';
      case 'first_hit': case 'hit': case 'achievement': return 'star';
      case 'first_flop': case 'farewell': return 'sweat';
      case 'comeback': return 'heart';
      case 'first_hire': case 'hire': return 'team';
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
    const task = working && p ? t('emp.task.project', { project: projectName(p) }) : working && s.contracts.active ? t('emp.task.contract', { client: s.contracts.active.clientId }) : t(`emp.activity.${e.activity}`);
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
      h('p.hint.task', null, h('b', null, `${t('emp.task')}: `), task),
      h('p.hint', null, t('emp.since', { day: since, days: Math.max(0, s.day - since) })),
      h('div.bio', null, ...biography(s, e).map((b) => h('p', null, tr(b)))),
      e.trait ? h('p.hint', null, t(`trait.${e.trait}.desc`)) : null,
      h('div.section', null, h('div.label', null, t('emp.skills')), ...SKILLS.map(skillRow), h('div.hint', null, t('emp.learning_hint'))),
      h('div.section', null, h('div.label', null, t('emp.specialties')),
        specs.length ? h('div.row', null, ...specs.map((sp) => h('span.chip.good', null, icon('star', 16), t('emp.specialty', { topic: sp.topicId, bonus: sp.bonus })))) : h('div.hint', null, t('emp.no_specialty'))),
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
      NEXT_SIZE[s.office.size ?? 'room'] && (full || free === 0) ? h('div.row.between.desk-hint', null, h('span.hint', null, t('team.expand_hint')),
        h('button.big-btn.ghost.small', { id: 'team-expand', onclick: () => this.showExpand() }, t('expand.button'))) : null,
    );
    this.openModal('team', card, { cls: 'desk-side' });
  }

  // ---------------------------------------------------------------- work
  showWorkChooser(): void {
    const s = this.state;
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
      h('p.hint.version', { id: 'menu-version' }, t('menu.version', { version: this.build.version, commit: this.build.commit, date: this.build.date })),
      h('p.hint.shortcuts', null, t('menu.shortcuts')),
      this.debug ? h('p.hint.version', null, t('menu.debug_sandbox')) : null,
    );
    this.openModal('menu', card);
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
        topic('sales', 'coin'), topic('office', 'decor'), topic('team', 'team'), topic('story', 'star'),
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
