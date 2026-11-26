import { ITEMS, type ItemCategory, type ItemDef } from '../content/officeItems';
import { unlocked } from '../sim/systems/progress';
import type { Command, CommandResult } from '../sim/commands';
import type { GameState, PlacedItem, Rot } from '../sim/model/state';
import { canPlace, founderDesk, getItemDef, officeEffects, rotatedSize, SELL_REFUND } from '../sim/systems/office';
import { iconUrl, type IconName } from '../render/icons';
import type { OfficeScene, TapTarget } from '../render/officeScene';
import { fmtMoney, t } from '../i18n/i18n';
import { achievementForItem, isUnlocked } from '../sim/systems/story';
import { DEFAULT_STYLE, FLOOR_STYLES, STYLE_PRICE, WALL_STYLES } from '../content/officeStyles';
import { NEXT_SIZE } from '../content/officeSizes';
import { FLOOR_FINISH, hexToCss, PALETTE_HEX, WALL_FINISH } from '../render/palette';
import { clear, h } from './dom';

/**
 * Decoration mode (LS.3): catalog, buying, placing, moving, rotating and
 * selling furniture with touch-friendly controls. All changes go through
 * simulation commands; the ghost preview uses the same `canPlace` rules.
 */
interface Host {
  state(): GameState;
  dispatch(cmd: Command): CommandResult;
  toast(text: string, icon?: IconName): void;
  /** Sound (0.18.0), optional. */
  sfx?(s: 'buy' | 'place' | 'error' | 'coin'): void;
  save(): void;
  pause(): () => void; // returns a restore function
  refreshHud(): void;
  /** Opens the "bigger studio" offer (AW.E.1). */
  expand(): void;
}

type Placement = { mode: 'buy' | 'move'; defId: string; uid?: string; x: number; z: number; rot: Rot };

const CATEGORY_ORDER: ItemCategory[] = ['computer', 'chair', 'desk', 'creative', 'comfort', 'plant', 'light', 'decor', 'awards', 'storage', 'tech'];
const icon = (name: IconName, size = 20) => h('img.px', { src: iconUrl(name, 32), width: size, height: size, alt: '' });

/** Plain-language effect chips (no numbers, GDD §23.2). */
export function effectChips(def: ItemDef): string[] {
  const e = def.effects ?? {};
  const out: string[] = [];
  if ((e.techSpeed ?? 1) > 1.1) out.push(t('fx.tech_up2'));
  else if ((e.techSpeed ?? 1) > 1) out.push(t('fx.tech_up'));
  if ((e.designSpeed ?? 1) > 1.1) out.push(t('fx.design_up2'));
  else if ((e.designSpeed ?? 1) > 1) out.push(t('fx.design_up'));
  if ((e.designSpeed ?? 1) < 1) out.push(t('fx.design_down'));
  if ((e.fatigue ?? 1) < 1) out.push(t('fx.fatigue_down'));
  if ((e.inspiration ?? 1) > 1) out.push(t('fx.ideas_up'));
  if ((e.rest ?? 0) > 0) out.push(t('fx.rest_up'));
  if ((e.coffee ?? 0) > 0) out.push(t('fx.coffee'));
  if ((e.drink ?? 0) > 0) out.push(t('fx.drink'));
  if ((e.ambiance ?? 0) >= 1.5) out.push(t('fx.ambiance_up2'));
  else if ((e.ambiance ?? 0) >= 0.5) out.push(t('fx.ambiance_up'));
  if (def.showcase) out.push(t('fx.showcase'));
  return out;
}

export class DecorUI {
  private el: HTMLElement | null = null;
  private placement: Placement | null = null;
  private pickDeskFor: string | null = null;
  private selected: string | null = null;
  private category: ItemCategory | 'style' = 'computer';
  /** Finish being tried in the office (not bought yet). */
  private styleDraft: { wall: string; floor: string } | null = null;
  private restore: (() => void) | null = null;

  constructor(private root: HTMLElement, private scene: OfficeScene, private host: Host) {}

  get active(): boolean {
    return !!this.el;
  }

  open(): void {
    if (this.el) return;
    this.restore = this.host.pause();
    this.scene.setDecorMode(true);
    this.el = h('div.decor');
    this.root.append(this.el);
    this.render();
  }

  close(): void {
    if (!this.el) return;
    // A finish that wasn't applied goes away with the preview.
    this.styleDraft = null;
    this.scene.previewRoomStyle(null);
    this.scene.setDecorMode(false);
    this.el.remove();
    this.el = null;
    this.placement = null;
    this.selected = null;
    this.pickDeskFor = null;
    this.host.save();
    this.restore?.();
    this.restore = null;
    this.host.refreshHud();
  }

  // ---------------------------------------------------------------- taps
  onTap(target: TapTarget): void {
    if (!this.el) return;
    const s = this.host.state();
    if (this.placement) {
      // While placing, a tap always means "the floor cell under my finger" (even over a rug or a chair).
      if ((target.kind === 'floor' || target.kind === 'item') && target.cell) {
        this.moveGhostTo(target.cell);
        // Mouse: the ghost already follows the cursor, so a click places it (if it fits).
        if (this.scene.lastPointerType === 'mouse' && this.placementError() === null) this.confirmPlacement();
      }
      return;
    }
    if (this.pickDeskFor && target.kind === 'item') {
      const it = s.office.items.find((i) => i.uid === target.uid);
      if (it && getItemDef(it.defId).category === 'desk') this.mount(this.pickDeskFor, it.uid);
      return;
    }
    if (target.kind === 'item') {
      this.selected = target.uid;
      this.render();
    } else {
      this.selected = null;
      this.render();
    }
  }

  // ------------------------------------------------------------- actions
  private startPlacement(p: Placement): void {
    this.placement = p;
    this.selected = null;
    if (p.mode === 'buy') {
      // Start at the first valid spot near the middle of the room.
      const found = this.findSpot(p.defId, p.rot);
      if (found) { p.x = found[0]; p.z = found[1]; }
    }
    this.updateGhost();
    this.render();
  }

  private findSpot(defId: string, rot: Rot): [number, number] | null {
    const office = this.host.state().office;
    const cells: [number, number][] = [];
    for (let z = 0; z < office.d; z++) for (let x = 0; x < office.w; x++) cells.push([x, z]);
    cells.sort((a, b) => Math.hypot(a[0] - 4, a[1] - 5) - Math.hypot(b[0] - 4, b[1] - 5));
    return cells.find(([x, z]) => canPlace(office, defId, x, z, rot) === null) ?? null;
  }

  private moveGhostTo(cell: [number, number]): void {
    const p = this.placement;
    if (!p) return;
    const office = this.host.state().office;
    const rs = rotatedSize(getItemDef(p.defId), p.rot);
    const x = Math.max(0, Math.min(office.w - rs.w, cell[0] - Math.floor((rs.w - 1) / 2)));
    const z = Math.max(0, Math.min(office.d - rs.d, cell[1] - Math.floor((rs.d - 1) / 2)));
    if (x === p.x && z === p.z) return;
    p.x = x;
    p.z = z;
    this.updateGhost();
    this.render();
  }

  /** Mouse hover (desktop): the ghost follows the cursor. */
  onHover(cell: [number, number] | null): void {
    if (this.el && this.placement && cell) this.moveGhostTo(cell);
  }

  /** Keyboard (desktop). Returns true if the key was used. */
  handleKey(key: string): boolean {
    if (!this.el) return false;
    if (key === 'Escape') {
      if (this.placement) this.cancelPlacement();
      else if (this.pickDeskFor) { this.pickDeskFor = null; this.render(); }
      else if (this.selected) { this.selected = null; this.render(); }
      else this.close();
      return true;
    }
    if ((key === 'r' || key === 'R') && this.placement) { this.rotatePlacement(); return true; }
    if (key === 'Enter' && this.placement && this.placementError() === null) { this.confirmPlacement(); return true; }
    return false;
  }

  private placementError(): string | null {
    const p = this.placement;
    if (!p) return null;
    return canPlace(this.host.state().office, p.defId, p.x, p.z, p.rot, p.uid);
  }

  private updateGhost(): void {
    const p = this.placement;
    if (!p) return this.scene.setGhost(null);
    this.scene.setGhost({ defId: p.defId, x: p.x, z: p.z, rot: p.rot, valid: this.placementError() === null, hideUid: p.uid });
  }

  private rotatePlacement(): void {
    const p = this.placement;
    if (!p) return;
    const office = this.host.state().office;
    p.rot = ((p.rot + 1) % 4) as Rot;
    const rs = rotatedSize(getItemDef(p.defId), p.rot);
    p.x = Math.min(p.x, office.w - rs.w);
    p.z = Math.min(p.z, office.d - rs.d);
    this.updateGhost();
    this.render();
  }

  private confirmPlacement(): void {
    const p = this.placement;
    if (!p) return;
    const res = p.mode === 'buy'
      ? this.host.dispatch({ type: 'buy_item', defId: p.defId, x: p.x, z: p.z, rot: p.rot })
      : this.host.dispatch({ type: 'move_item', uid: p.uid!, x: p.x, z: p.z, rot: p.rot });
    if (!res.ok) { this.host.sfx?.('error'); return this.host.toast(t(`error.${res.error}`), 'alert'); }
    if (p.mode === 'buy') { this.host.sfx?.('buy'); this.host.toast(t('decor.bought', { item: p.defId }), 'decor'); }
    this.host.sfx?.('place');
    this.placement = null;
    this.scene.setGhost(null);
    this.render();
  }

  private cancelPlacement(): void {
    this.placement = null;
    this.scene.setGhost(null);
    this.render();
  }

  private buy(def: ItemDef): void {
    if (def.layer === 'mount') {
      const desks = this.host.state().office.items.filter((i) => getItemDef(i.defId).category === 'desk');
      if (desks.length === 1) this.mount(def.id, desks[0]!.uid);
      else {
        this.pickDeskFor = def.id;
        this.render();
      }
      return;
    }
    this.startPlacement({ mode: 'buy', defId: def.id, x: 0, z: 0, rot: 0 });
  }

  private mount(defId: string, deskUid: string): void {
    this.pickDeskFor = null;
    const res = this.host.dispatch({ type: 'mount_item', defId, deskUid });
    if (!res.ok) { this.host.sfx?.('error'); this.host.toast(t(`error.${res.error}`), 'alert'); }
    else { this.host.sfx?.('buy'); this.host.toast(t('decor.bought', { item: defId }), 'decor'); }
    this.render();
  }

  private sell(it: PlacedItem): void {
    const before = this.host.state().company.money;
    const res = this.host.dispatch({ type: 'sell_item', uid: it.uid });
    if (!res.ok) { this.host.sfx?.('error'); return this.host.toast(t(`error.${res.error}`), 'alert'); }
    this.host.sfx?.('coin');
    this.host.toast(t('decor.sold', { refund: this.host.state().company.money - before }), 'coin');
    this.selected = null;
    this.render();
  }

  private rotateInPlace(it: PlacedItem): void {
    for (let k = 1; k <= 3; k++) {
      const rot = ((it.rot + k) % 4) as Rot;
      const rs = rotatedSize(getItemDef(it.defId), rot);
      const office = this.host.state().office;
      const x = Math.min(it.x, office.w - rs.w), z = Math.min(it.z, office.d - rs.d);
      if (canPlace(office, it.defId, x, z, rot, it.uid) === null) {
        this.host.dispatch({ type: 'move_item', uid: it.uid, x, z, rot });
        this.render();
        return;
      }
    }
    this.host.toast(t('error.place_blocks_access'), 'alert');
  }

  // --------------------------------------------------------------- render
  private render(): void {
    const el = this.el;
    if (!el) return;
    clear(el);
    const s = this.host.state();
    const fx = officeEffects(s.office);
    el.append(
      h('div.decor-top', null,
        h('div.pill', null, icon('coin'), h('span', null, t('decor.money', { money: s.company.money }))),
        fx.upkeep > 0 ? h('div.pill.small', null, t('decor.upkeep_total', { upkeep: fx.upkeep })) : null,
        NEXT_SIZE[s.office.size ?? 'room'] && unlocked(s, 'expansion') ? h('button.big-btn.ghost', { id: 'decor-expand', onclick: () => { this.close(); this.host.expand(); } }, t('expand.button')) : null,
        h('button.big-btn.mint', { id: 'decor-done', onclick: () => this.close() }, t('decor.done')),
      ),
    );
    if (this.placement) {
      const err = this.placementError();
      const def = getItemDef(this.placement.defId);
      el.append(h('div.decor-place', null,
        h('div.decor-hint', null, err ? t(`error.place_${err}`) : t(finePointer() ? 'decor.place_hint_mouse' : 'decor.place_hint')),
        h('div.row', null,
          def.rotatable ? h('button.big-btn.ghost', { id: 'decor-rotate', onclick: () => this.rotatePlacement() }, icon('rotate'), ` ${t('decor.rotate')}`) : null,
          h('button.big-btn.ghost', { onclick: () => this.cancelPlacement() }, t('decor.cancel')),
          h('button.big-btn.mint', { id: 'decor-confirm', disabled: !!err, onclick: () => this.confirmPlacement() }, this.placement.mode === 'buy' ? `${t('decor.confirm')} · ${fmtMoney(def.price + (def.category === 'desk' ? getItemDef('pc_basic').price + getItemDef('chair_basic').price : 0))}` : t('decor.confirm')),
        ),
      ));
      return;
    }
    if (this.pickDeskFor) {
      el.append(h('div.decor-place', null, h('div.decor-hint', null, t('decor.pick_desk')), h('button.big-btn.ghost', { onclick: () => { this.pickDeskFor = null; this.render(); } }, t('decor.cancel'))));
      return;
    }
    if (this.selected) {
      const it = s.office.items.find((i) => i.uid === this.selected);
      if (it) {
        const def = getItemDef(it.defId);
        let refund = Math.round(def.price * SELL_REFUND);
        for (const m of [it.mounts?.computer, it.mounts?.chair]) if (m) refund += Math.round(getItemDef(m).price * SELL_REFUND);
        el.append(h('div.decor-sheet.card', null,
          h('h2', null, t(`item.${def.id}.name`)),
          h('p.sub', null, t(`item.${def.id}.desc`)),
          it.mounts ? h('div.row', null,
            it.mounts.computer ? h('span.chip', null, icon('code', 16), t(`item.${it.mounts.computer}.name`)) : null,
            it.mounts.chair ? h('span.chip', null, icon('sweat', 16), t(`item.${it.mounts.chair}.name`)) : null,
            founderDesk(s.office)?.uid === it.uid ? h('span.chip.good', null, t('decor.founder_desk')) : null) : null,
          h('div.row', null, ...effectChips(def).map((c) => h('span.chip.good', null, c))),
          h('div.actions', null,
            h('button.big-btn.ghost', { id: 'decor-move', onclick: () => this.startPlacement({ mode: 'move', defId: def.id, uid: it.uid, x: it.x, z: it.z, rot: it.rot }) }, t('decor.move')),
            def.rotatable ? h('button.big-btn.ghost', { onclick: () => this.rotateInPlace(it) }, icon('rotate'), ` ${t('decor.rotate')}`) : null,
            h('button.big-btn.coral', { id: 'decor-sell', onclick: () => this.sell(it) }, t('decor.sell', { refund })),
            h('button.big-btn.ghost', { onclick: () => { this.selected = null; this.render(); } }, t('common.close')),
          ),
        ));
        return;
      }
    }
    // Catalog
    // Progression (D-062): equipment with the first game in production, desks with the team.
    const st = this.host.state();
    const shown = (c: ItemCategory) => (['computer', 'chair', 'creative'].includes(c) ? unlocked(st, 'equipment') : c === 'desk' ? unlocked(st, 'team') : c === 'awards' ? Object.keys(st.story.achievements).length > 0 : true);
    const cats = CATEGORY_ORDER.filter((c) => ITEMS.some((d) => d.category === c) && shown(c));
    if (this.category !== 'style' && !cats.includes(this.category)) this.category = 'style';
    const desk = founderDesk(s.office);
    const installed = new Set([desk?.mounts?.computer, desk?.mounts?.chair]);
    const tabs = h('div.decor-tabs', null,
      h('button', { class: this.category === 'style' ? 'on' : '', dataset: { cat: 'style' }, onclick: () => { this.category = 'style'; this.render(); } }, t('decor.style_tab')),
      ...cats.map((c) => h('button', { class: c === this.category ? 'on' : '', dataset: { cat: c }, onclick: () => { this.category = c; this.render(); } }, t(`cat.${c}`))),
    );
    const cozy = officeEffects(s.office).cozy;
    const cozyHint = h(`div.hint.cozy${cozy ? '.on' : ''}`, null, t(cozy ? 'decor.cozy_on' : 'decor.cozy_off'));
    if (this.category === 'style') {
      el.append(h('div.decor-sheet.card', null, tabs, this.styleSheet(s), cozyHint));
      return;
    }
    el.append(h('div.decor-sheet.card', null,
      tabs,
      h('div.decor-items', null, ...ITEMS.filter((d) => d.category === this.category).sort((a, b) => Number(isUnlocked(s, b.id)) - Number(isUnlocked(s, a.id))).map((d) => {
        const isInstalled = d.layer === 'mount' && installed.has(d.id);
        const earned = isUnlocked(s, d.id);
        const ach = achievementForItem(d.id);
        const label = d.locked ? t('decor.locked') : !earned ? t('decor.not_earned') : isInstalled ? t('decor.installed') : d.layer === 'mount' ? t('decor.install') : t('decor.buy');
        const affordable = s.company.money >= d.price;
        return h(`div.decor-item${earned ? '' : '.unearned'}`, { dataset: { item: d.id } },
          h('div.t', null, earned ? t(`item.${d.id}.name`) : t('decor.secret')),
          h('div.d', null, earned ? t(`item.${d.id}.desc`) : t('decor.earn_with', { goal: t(`ach.${ach!.id}.goal`) })),
          h('div.row', null, ...(earned ? effectChips(d) : []).map((c) => h('span.chip.good', null, c)), d.category === 'awards' && earned ? h('span.chip.trait', null, t('decor.award_chip')) : null),
          h('div.row.between', null,
            h('span.price', null, fmtMoney(d.price), d.upkeep ? h('span.upkeep', null, ` ${t('decor.upkeep', { upkeep: d.upkeep })}`) : null),
            h('button.big-btn.mint.small', { disabled: !!d.locked || !earned || isInstalled || !affordable, dataset: { buy: d.id }, onclick: () => this.buy(d) }, label),
          ),
        );
      })),
      cozyHint,
      h('div.hint', null, t('decor.hint')),
    ));
  }

  /** Walls & floor (AW.C.3): pick a finish, see it in the office, pay only if you apply it. */
  private styleSheet(s: GameState): HTMLElement {
    const real = s.office.style ?? DEFAULT_STYLE;
    const draft = this.styleDraft ?? { ...real };
    const pick = (part: 'wall' | 'floor', id: string) => {
      this.styleDraft = { ...draft, [part]: id };
      this.scene.previewRoomStyle(this.styleDraft);
      this.render();
    };
    const swatch = (part: 'wall' | 'floor', id: string) => {
      const color = part === 'wall' ? WALL_FINISH[id]![0] : (FLOOR_FINISH[id]!.planks?.[0] ?? FLOOR_FINISH[id]!.tiles?.[0] ?? FLOOR_FINISH[id]!.carpet?.[0])!;
      return h('button.finish', { class: draft[part] === id ? 'on' : '', dataset: { [part]: id }, onclick: () => pick(part, id) },
        h('i', { style: { background: hexToCss(PALETTE_HEX[color] ?? 0) } }), t(`style.${part}.${id}`), real[part] === id ? h('span.cur', null, ' ✓') : null);
    };
    const cost = (draft.wall !== real.wall ? STYLE_PRICE.wall : 0) + (draft.floor !== real.floor ? STYLE_PRICE.floor : 0);
    return h('div.style-sheet', null,
      h('div.label', null, t('decor.walls')), h('div.finishes', null, ...WALL_STYLES.map((id) => swatch('wall', id))),
      h('div.label', null, t('decor.floors')), h('div.finishes', null, ...FLOOR_STYLES.map((id) => swatch('floor', id))),
      h('div.row.between', null,
        h('span.hint', null, t('decor.style_hint')),
        h('button.big-btn.mint.small', { id: 'style-apply', disabled: cost === 0 || s.company.money < cost, onclick: () => {
          const r = this.host.dispatch({ type: 'set_office_style', wall: draft.wall, floor: draft.floor });
          if (!r.ok) return this.host.toast(t(`error.${r.error}`), 'alert');
          this.styleDraft = null;
          this.scene.previewRoomStyle(null, { ...draft });
          this.render();
        } }, t('decor.style_apply', { cost })),
      ),
    );
  }
}

/** True on devices with a mouse/trackpad (desktop web). */
function finePointer(): boolean {
  try { return matchMedia('(pointer: fine)').matches; } catch { return false; }
}
