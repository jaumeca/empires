import type { Command, CommandResult } from '../sim/commands';
import type { GameState } from '../sim/model/state';
import { getFounder } from '../sim/state';
import { currentStep, tutorialProgress, type TutorialStep } from '../sim/systems/tutorial';
import type { OfficeScene } from '../render/officeScene';
import { iconUrl, type IconName } from '../render/icons';
import { CATALOGS, t } from '../i18n/i18n';
import { h } from './dom';

const icon = (name: IconName, size = 22) => h('img.px', { src: iconUrl(name, 32), width: size, height: size, alt: '' });
const hasKey = (k: string) => k in CATALOGS.es;

/**
 * In-game tutorial (AW.A): a small coach card that never blocks the game, a
 * glow on the button to use and, for things in the office, a bouncing pointer.
 * Progress lives in the game state (systems/tutorial.ts); this only shows it.
 * Hidden while a decision or any unrelated window is open.
 */
export interface TutorialHost {
  state(): GameState;
  dispatch(cmd: Command): CommandResult;
  modalKind(): string;
  decorActive(): boolean;
  toast(text: string, ic?: IconName): void;
}

interface StepView {
  text: string;
  /** CSS selector of the UI element to highlight. */
  target?: string;
  /** Office thing to point at. */
  world?: { empirian?: string; item?: string };
  /** Info step: completed with a button. */
  ok?: boolean;
}

export function finePointer(): boolean {
  try { return matchMedia('(pointer: fine)').matches; } catch { return false; }
}

export class TutorialUI {
  private card: HTMLElement | null = null;
  private arrow: HTMLElement | null = null;
  private key = '';
  private glowing: Element | null = null;
  private view: StepView | null = null;

  constructor(private root: HTMLElement, private scene: OfficeScene, private host: TutorialHost) {}

  /** Records a UI-only fact for the tutorial (e.g. "opened an Empirian card"). */
  mark(step: TutorialStep): void {
    const s = this.host.state();
    if (s.tutorial.active && !s.tutorial.marks.includes(step)) this.host.dispatch({ type: 'tutorial', action: 'mark', step });
  }

  private viewFor(step: TutorialStep, s: GameState, modal: string): StepView | null {
    const desk = finePointer();
    const k = (base: string) => t(desk && hasKey(`${base}_desktop`) ? `${base}_desktop` : base, { name: s.setupComplete ? getFounder(s).name : '' });
    const shelf = s.office.items.find((i) => i.defId === 'bookshelf');
    switch (step) {
      case 'founder': return modal === 'creator' ? { text: k('tut.founder'), target: '#start-game' } : null;
      case 'meet': return { text: k('tut.meet'), world: { empirian: s.founderId } };
      case 'speed': return { text: k('tut.speed'), target: '.speeds' };
      case 'first_game':
        if (modal === 'new-project') return { text: k('tut.plan'), target: '#start-project' };
        if (modal === 'work') return { text: k('tut.first_game'), target: '#choose-game' };
        return { text: k('tut.first_game'), target: '#hud-new-project' };
      case 'progress': return { text: k('tut.progress'), target: '.project-pill' };
      case 'decision': return { text: k('tut.decision') };
      case 'release': return { text: k('tut.release'), target: document.getElementById('hud-release') ? '#hud-release' : '.project-pill' };
      case 'reviews':
        if (modal.startsWith('results:')) return { text: k('tut.reviews_open') };
        return { text: k('tut.reviews'), world: shelf ? { item: shelf.uid } : undefined };
      case 'decorate': return this.host.decorActive() ? { text: k('tut.decorate_open') } : { text: k('tut.decorate'), target: '#hud-decor' };
      case 'story': return modal === 'story' ? null : { text: k('tut.story'), world: shelf ? { item: shelf.uid } : undefined };
      case 'hiring': return { text: k('tut.hiring'), target: document.getElementById('hud-team') ? '#hud-team' : undefined, ok: true };
    }
  }

  /** Windows during which a step may still show (everything else hides the coach). */
  private allowedWith(step: TutorialStep, modal: string): boolean {
    if (!modal) return true;
    if (modal === 'decision') return false;
    return (step === 'founder' && modal === 'creator') || (step === 'first_game' && (modal === 'new-project' || modal === 'work'))
      || (step === 'reviews' && modal.startsWith('results:')) || (step === 'meet' && modal === 'empirian');
  }

  /** Per frame (cheap): rebuilds the card only when the step or context changes. */
  frame(): void {
    const s = this.host.state();
    const step = currentStep(s);
    if (s.tutorial.active && step === null && s.setupComplete) {
      this.host.dispatch({ type: 'tutorial', action: 'finish' });
      this.host.toast(t('tut.finished'), 'star');
    }
    const modal = this.host.modalKind();
    const show = step && !s.pendingDecision && this.allowedWith(step, modal) && (!this.host.decorActive() || step === 'decorate');
    const v = show && step ? this.viewFor(step, s, modal) : null;
    const key = v ? `${step}|${v.text}|${v.target ?? ''}|${modal}` : '';
    // A window rebuilt its content (or closed): place the guide again.
    if (this.card && !this.card.isConnected) this.key = '#';
    if (key !== this.key) {
      this.key = key;
      this.view = v;
      this.render(step, v);
    }
    this.place();
  }

  /** True while the coach is guiding (the founder's own speech bubble stays quiet). */
  get visible(): boolean {
    return !!this.card;
  }

  private render(step: TutorialStep | null, v: StepView | null): void {
    this.card?.remove();
    this.card = null;
    this.glowing?.classList.remove('tut-target');
    this.glowing = null;
    if (!v || !step) { this.arrow?.remove(); this.arrow = null; return; }
    const p = tutorialProgress(this.host.state());
    // With a window open, the guide sits inside it (never on top of its controls).
    const host = (this.host.modalKind() && document.querySelector('.backdrop .card')) as HTMLElement | null;
    this.card = h(`div.coach${host ? '.inline' : ''}`, { id: 'tutorial-coach', dataset: { step } },
      h('div.coach-head', null, icon('star', 16), t('tut.header', { n: Math.min(p.total, p.done + 1), total: p.total })),
      h('div.coach-text', null, v.text),
      h('div.coach-actions', null,
        v.ok ? h('button.big-btn.mint.small', { id: 'tutorial-ok', onclick: () => this.mark(step) }, t('tut.ok')) : null,
        h('button.link', { id: 'tutorial-skip', onclick: () => { this.host.dispatch({ type: 'tutorial', action: 'skip' }); this.host.toast(t('tut.skipped'), 'alert'); } }, t('tut.skip')),
      ),
    );
    if (host) host.insertBefore(this.card, host.querySelector('h2')?.nextSibling ?? host.firstChild);
    else this.root.append(this.card);
    if (v.world && !this.arrow) {
      this.arrow = h('div.tut-arrow');
      this.root.append(this.arrow);
    } else if (!v.world) { this.arrow?.remove(); this.arrow = null; }
  }

  /** The HUD was rebuilt: highlight the new button right away. */
  reglow(): void {
    this.place();
  }

  private place(): void {
    const v = this.view;
    if (!v) return;
    if (v.target) {
      const el = document.querySelector(v.target);
      if (el !== this.glowing) {
        this.glowing?.classList.remove('tut-target');
        el?.classList.add('tut-target');
        this.glowing = el;
      }
    }
    if (this.arrow && v.world) {
      const pos = v.world.empirian ? this.scene.empirianScreenPos(v.world.empirian) : v.world.item ? this.scene.itemScreenPos(v.world.item) : null;
      if (pos) {
        this.arrow.style.left = `${pos.x}px`;
        this.arrow.style.top = `${pos.y - 8}px`;
        this.arrow.style.display = '';
      } else this.arrow.style.display = 'none';
    }
  }
}
