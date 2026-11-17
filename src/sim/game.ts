import { SIM_CONFIG, msPerTickAt1x, type Speed } from './config';
import type { SimEvent } from './core/events';
import { applyCommand, type Command, type CommandResult } from './commands';
import type { GameState } from './model/state';
import { step } from './step';
import { forceEvent } from './systems/events';

/**
 * Converts real elapsed time into a whole number of simulation ticks
 * (fixed timestep with accumulator). Rendering FPS never affects outcomes:
 * only the number of ticks and the commands applied between them do.
 */
export class SimClock {
  private acc = 0;
  speed: Speed = 0;

  constructor(public msPerTick: number = msPerTickAt1x()) {}

  setSpeed(speed: Speed): void {
    this.speed = speed;
    if (speed === 0) this.acc = 0;
  }

  /** Returns how many ticks are due for `realMs` of elapsed real time. */
  consume(realMs: number): number {
    if (this.speed === 0 || realMs <= 0) return 0;
    this.acc += realMs * this.speed;
    // Small epsilon absorbs float drift from fractional frame times (e.g. 1000/120 ms).
    let n = Math.floor((this.acc + 1e-6) / this.msPerTick);
    if (n > SIM_CONFIG.maxTicksPerFrame) {
      // Device too slow / tab was frozen: drop the backlog (game time slows down,
      // results stay identical because they depend only on ticks and commands).
      n = SIM_CONFIG.maxTicksPerFrame;
      this.acc = 0;
    } else {
      this.acc = Math.max(0, this.acc - n * this.msPerTick);
    }
    return n;
  }
}

export type GameListener = (events: SimEvent[], state: GameState) => void;

/** Owns the state, the clock and the command log. No rendering, no DOM. */
export class Game {
  readonly clock: SimClock;
  private listeners: GameListener[] = [];
  private scheduled = new Map<number, Command[]>();
  /**
   * In-memory log of applied commands (debugging / replays of a session).
   * Not saved: a save file is itself a full checkpoint (state + RNG), so a game
   * is reproducible from any save plus the commands issued after it. Capped to
   * keep memory bounded in long sessions; `commandLogDropped` counts the trimmed ones.
   */
  readonly commandLog: { tick: number; cmd: Command }[] = [];
  commandLogLimit = 5000;
  commandLogDropped = 0;
  /** When true, decisive events pause the clock automatically. */
  autoPauseOnDecisive = true;

  constructor(
    public state: GameState,
    msPerTick?: number,
  ) {
    this.clock = new SimClock(msPerTick);
  }

  onUpdate(l: GameListener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }

  /** Applies a command immediately (between ticks). */
  dispatch(cmd: Command): CommandResult {
    const events: SimEvent[] = [];
    const res = applyCommand(this.state, cmd, (e) => events.push(e));
    if (res.ok) this.logCommand(cmd);
    this.handleEvents(events);
    return res;
  }

  /** Debug/tests: raises a dynamic event now if its trigger holds (ignores chance and pacing). */
  forceEvent(kind: string): boolean {
    const events: SimEvent[] = [];
    const ok = forceEvent(this.state, kind, (e) => events.push(e));
    this.handleEvents(events);
    return ok;
  }

  /** Schedules a command to run right before the given tick (used for replays/tests). */
  schedule(tick: number, cmd: Command): void {
    const list = this.scheduled.get(tick) ?? [];
    list.push(cmd);
    this.scheduled.set(tick, list);
  }

  /** Called once per rendered frame with the real elapsed time. */
  frame(realMs: number): number {
    const n = this.clock.consume(realMs);
    let done = 0;
    for (let i = 0; i < n && this.clock.speed !== 0; i++) {
      this.tick();
      done++;
    }
    return done;
  }

  /** Advances exactly one tick regardless of the clock (tests, sim-runner). */
  tick(): SimEvent[] {
    const events: SimEvent[] = [];
    const sink = (e: SimEvent) => events.push(e);
    const due = this.scheduled.get(this.state.tick);
    if (due) {
      this.scheduled.delete(this.state.tick);
      for (const cmd of due) {
        const res = applyCommand(this.state, cmd, sink);
        if (res.ok) this.logCommand(cmd);
      }
    }
    step(this.state, sink);
    this.handleEvents(events);
    return events;
  }

  private logCommand(cmd: Command): void {
    this.commandLog.push({ tick: this.state.tick, cmd });
    if (this.commandLog.length > this.commandLogLimit) {
      const extra = this.commandLog.length - this.commandLogLimit;
      this.commandLog.splice(0, extra);
      this.commandLogDropped += extra;
    }
  }

  private handleEvents(events: SimEvent[]): void {
    if (this.autoPauseOnDecisive && events.some((e) => e.severity === 'decisive')) {
      this.clock.setSpeed(0);
    }
    for (const l of this.listeners) l(events, this.state);
  }
}
