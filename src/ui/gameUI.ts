import type { Speed } from '../sim/config';
import type { SimEvent } from '../sim/core/events';
import { PROJECT_LIMITS } from '../sim/commands';
import { SIM_CONFIG } from '../sim/config';
import { estimatePlan, estimateProgress } from '../sim/estimates';
import type { Game } from '../sim/game';
import type { Appearance, GameState, PendingDecision, Project, ProjectSize, SkillId } from '../sim/model/state';
import { progressToNext, SKILLS, specializations } from '../sim/systems/progression';
import { getActiveProject, getFounder, getProject } from '../sim/state';
import { officeWorkMultiplier, productionProgress } from '../sim/systems/project';
import { officeEffects } from '../sim/systems/office';
import type { BuildInfo } from '../app/buildInfo';
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
    this.decor = new DecorUI(root, scene, {
      state: () => this.game.state,
      dispatch: (cmd) => this.game.dispatch(cmd),
      toast: (text, ic) => this.toast(text, ic),
      save: () => this.services.save(),
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

  // ------------------------------------------------------------------- HUD
  private hudRefs: { day?: HTMLElement; money?: HTMLElement; bar?: HTMLElement; bugs?: HTMLElement; days?: HTMLElement; phase?: HTMLElement } = {};

  renderHud(force = false): void {
    const s = this.state;
    const p = getActiveProject(s);
    // Structure is rebuilt only when it changes; values are patched in place so
    // buttons are never replaced under the player's finger.
    const key = JSON.stringify([this.game.clock.speed, p?.id, p?.phase, s.setupComplete, !!this.modal, s.projects.length, this.unreadNews(), s.contracts.active?.id, s.contracts.offers.length]);
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
      h('button', { class: `${speed === v ? 'on' : ''} ${v === 0 ? 'paused' : ''}`, 'aria-label': v === 0 ? t('hud.pause') : t('hud.speed', { n: v }), dataset: { speed: String(v) }, onclick: () => this.setSpeed(v) }, label);
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
        h('button.icon-btn.badge-host', { 'aria-label': t('daily.button'), id: 'hud-news', onclick: () => this.showDaily() }, icon('news'), this.unreadNews() ? h('span.badge', null, String(Math.min(9, this.unreadNews()))) : null),
        h('button.icon-btn', { 'aria-label': t('decor.button'), id: 'hud-decor', onclick: () => this.decor.open() }, icon('decor')),
        h('button.icon-btn', { 'aria-label': t('hud.menu'), id: 'hud-menu', onclick: () => this.showMenu() }, icon('menu')),
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
    const s = this.state;
    const founder = s.setupComplete ? getFounder(s) : null;
    const want = founder && !this.modal && !this.decor.active && !getActiveProject(s) && !s.contracts.active && founder.activity !== 'celebrating' ? (!s.projects.length ? t('speech.first') : s.contracts.offers.length ? t('speech.idle_options') : t('speech.again')) : null;
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
    this.renderHud(true);
  }

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
      case 'shelf': {
        const n = s.projects.filter((p) => p.result).length;
        this.toast(n ? t('toast.shelf', { count: n }) : t('toast.shelf_empty'), 'box');
        break;
      }
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
    const nameInput = h('input', { type: 'text', placeholder: t('creator.name'), id: 'founder-name', maxLength: 24, value: name, oninput: (e: Event) => (name = (e.target as HTMLInputElement).value) });
    const companyInput = h('input', { type: 'text', placeholder: t('creator.company'), id: 'company-name', maxLength: 32, value: company, oninput: (e: Event) => (company = (e.target as HTMLInputElement).value) });

    const card = h('div.card', null,
      h('h2', null, t('creator.title')),
      h('p.sub', null, t('creator.sub')),
      h('div.section', null, nameInput),
      h('div.section', null, companyInput),
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
    };
    const est = h('div.row');
    const budgetLbl = h('span');
    const daysLbl = h('span');
    const focusLbl = h('span');
    const refresh = () => {
      const e = estimatePlan(founder, plan.size, plan.focus, plan.budget, plan.days, officeWorkMultiplier(officeEffects(s.office), 'mixed', plan.focus));
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
        topicTiles.append(h('button.tile', { class: plan.topicId === topic.id ? 'on' : '', dataset: { topic: topic.id }, onclick: () => { plan.topicId = topic.id; drawTopics(); } },
          h('div.t', null, t(`topic.${topic.id}.name`)),
          (() => { const m = topicMood(s, topic.id); return m === 'calm' ? null : h(`span.mood.${m}`, null, t(`mood.${m}`)); })(),
          h('div.d', null, t(`topic.${topic.id}.blurb`))));
      }
    };
    drawTopics();
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
            h('div.section', null, h('label', null, t('np.size')), seg([['small', t('np.size.small')], ['medium', t('np.size.medium')]], () => plan.size, (v) => (plan.size = v as ProjectSize))),
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
    const c = h('canvas.portrait', { width: 40, height: 40 });
    const ctx = c.getContext('2d');
    if (ctx) {
      drawFace(ctx, 'surprised', partColors(e.appearance).skin, 4);
      ctx.fillStyle = hexToCss(PALETTE_HEX[partColors(e.appearance).hair] ?? 0);
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
      h('div.options', null, ...d.options.map((o) =>
        h('button.option', { dataset: { option: o.id }, disabled: !!o.disabledReason, onclick: () => {
          const r = this.game.dispatch({ type: 'choose_option', decisionId: d.id, optionId: o.id });
          if (!r.ok) return this.toast(t(`error.${r.error}`));
          if (this.resumeSpeed === 0) this.resumeSpeed = 1;
          this.closeModal(o.id !== 'release');
          this.services.save();
        } },
          h('div.t', null, tr(o.label)),
          h('div.hs', null, ...o.hints.map((x) => h('span.chip', null, tr(x)))),
        ),
      )),
    );
    this.openModal('decision', card);
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
      h('div.actions', null, h('button.big-btn.mint', { onclick: () => this.closeModal(true) }, t('res.continue'))),
    );
    this.openModal(`results:${projectId}`, card);
  }

  // -------------------------------------------------------------- empirian
  private showEmpirian(id: string): void {
    const e = this.state.empirians.find((x) => x.id === id);
    if (!e) return;
    const skillIcon: Record<SkillId, IconName> = { tech: 'code', design: 'design', creativity: 'idea', management: 'calendar' };
    const skillRow = (k: SkillId) =>
      h('div.skill', null,
        icon(skillIcon[k], 18),
        h('span.skill-name', null, t(`skill.${k}`)),
        h('span.skill-lvl', null, String(Math.floor(e.skills[k]))),
        h('div.bar.skill-bar', null, h('i', { style: { width: `${Math.round(progressToNext(e, k) * 100)}%` } })),
      );
    const specs = specializations(e);
    const card = h('div.card.narrow', null, this.closeBtn(),
      h('div.row', { style: { flexWrap: 'nowrap' } }, this.portrait(id), h('div', null, h('h2', null, e.name), h('p.sub', null, t(`emp.activity.${e.activity}`)))),
      h('div.row', null,
        h(`span.chip.${e.energy < 30 ? 'bad' : 'good'}`, null, icon('sweat', 16), t('emp.energy', { n: e.energy })),
        h('span.chip', null, icon('heart', 16), t('emp.morale', { n: e.morale })),
      ),
      h('div.section', null, h('div.label', null, t('emp.skills')), ...SKILLS.map(skillRow), h('div.hint', null, t('emp.learning_hint'))),
      h('div.section', null, h('div.label', null, t('emp.specialties')),
        specs.length ? h('div.row', null, ...specs.map((sp) => h('span.chip.good', null, icon('star', 16), t('emp.specialty', { topic: sp.topicId, bonus: sp.bonus })))) : h('div.hint', null, t('emp.no_specialty'))),
    );
    this.openModal('empirian', card, { pause: false });
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
    this.openModal('contracts', card);
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
    this.openModal('contract', card);
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
    this.openModal('daily', card);
  }

  // ------------------------------------------------------------------- menu
  showMenu(): void {
    const cam = this.scene.getCameraMode();
    const card = h('div.card.narrow', null, this.closeBtn(),
      h('h2', null, t('menu.title')),
      h('p.sub', null, t('menu.sub')),
      h('div.actions', { style: { justifyContent: 'stretch', flexDirection: 'column' } },
        h('button.big-btn.mint', { onclick: () => { this.services.save(); this.toast(t('toast.saved'), 'check'); this.closeModal(true); } }, t('menu.save')),
        h('button.big-btn.ghost', { onclick: () => this.services.exportSave() }, t('menu.export')),
        h('button.big-btn.ghost', { onclick: () => void this.services.importSave() }, t('menu.import')),
        h('button.big-btn.ghost', { onclick: () => { this.services.setCamera(cam === 'iso' ? 'dim' : 'iso'); this.showMenu(); } }, t('menu.camera', { mode: t(`menu.camera.${cam}`) })),
        h('button.big-btn.ghost', { id: 'menu-language', onclick: () => { const next: Locale = getLocale() === 'es' ? 'en' : 'es'; this.services.setLocale(next); setLocale(next); this.renderHud(true); this.showMenu(); } }, t('menu.language', { lang: LOCALE_NAMES[getLocale()] })),
        h('button.big-btn.coral', { onclick: () => { if (confirm(t('menu.new_game_confirm'))) this.services.newGame(); } }, t('menu.new_game')),
      ),
      h('p.hint.version', { id: 'menu-version' }, t('menu.version', { version: this.build.version, commit: this.build.commit, date: this.build.date })),
      this.debug ? h('p.hint.version', null, t('menu.debug_sandbox')) : null,
    );
    this.openModal('menu', card);
  }

  isModalOpen(): boolean {
    return !!this.modal;
  }
}

function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}
