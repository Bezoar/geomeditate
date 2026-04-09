import type { SolveReplay } from '../solver/verifier';
import { coordKey } from '../model/hex-coord';

export interface ReplayHighlights {
  /** Cells deduced in the current step, with their result. */
  deducedCells: Map<string, 'filled' | 'empty'>;
  /** Clue IDs that produced the current step's deductions. */
  activeClueIds: Set<string>;
  /** Cells the solver couldn't resolve (only on stuck state). */
  stuckCells: Set<string>;
}

function emptyHighlights(): ReplayHighlights {
  return {
    deducedCells: new Map(),
    activeClueIds: new Set(),
    stuckCells: new Set(),
  };
}

export class ReplayController {
  private readonly replay: SolveReplay;
  private readonly onChange: (
    highlights: ReplayHighlights,
    stepIndex: number,
    total: number,
  ) => void;
  private speed: number;

  private currentStep: number = -1;
  private playing: boolean = false;
  private timerId: ReturnType<typeof window.setTimeout> | null = null;

  constructor(
    replay: SolveReplay,
    onChange: (highlights: ReplayHighlights, stepIndex: number, total: number) => void,
    speed: number = 500,
  ) {
    this.replay = replay;
    this.onChange = onChange;
    this.speed = speed;
  }

  get totalSteps(): number {
    return this.replay.steps.length;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isStuck(): boolean {
    return this.replay.stuck;
  }

  stepForward(): void {
    const lastNormalStep = this.replay.steps.length - 1;
    const stuckStep = this.replay.stuck ? this.replay.steps.length : -1;

    if (this.currentStep < lastNormalStep) {
      this.currentStep++;
      this.emit();
    } else if (this.replay.stuck && this.currentStep === lastNormalStep) {
      // Advance to stuck state
      this.currentStep = stuckStep;
      this.emitStuck();
    }
    // If already at stuck step or past end, do nothing
  }

  stepBack(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.emit();
    } else if (this.currentStep === 0) {
      this.currentStep = -1;
      this.onChange(emptyHighlights(), -1, this.replay.steps.length);
    }
    // Already at -1: do nothing
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.scheduleNext();
  }

  pause(): void {
    this.playing = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  reset(): void {
    this.pause();
    this.currentStep = -1;
    this.onChange(emptyHighlights(), -1, this.replay.steps.length);
  }

  setSpeed(ms: number): void {
    this.speed = ms;
  }

  private scheduleNext(): void {
    if (!this.playing) return;

    this.timerId = window.setTimeout(() => {
      this.timerId = null;
      const atLastNormal = this.currentStep === this.replay.steps.length - 1;
      const atStuck =
        this.replay.stuck && this.currentStep === this.replay.steps.length;

      if (atStuck) {
        // Already at stuck display, stop
        this.playing = false;
        return;
      }

      this.stepForward();

      const nowAtEnd =
        this.currentStep === this.replay.steps.length - 1 && !this.replay.stuck;
      const nowAtStuck =
        this.replay.stuck && this.currentStep === this.replay.steps.length;

      if (nowAtEnd || nowAtStuck) {
        this.playing = false;
        return;
      }

      if (atLastNormal && !this.replay.stuck) {
        // Non-stuck: we just emitted the last step, stop
        this.playing = false;
        return;
      }

      this.scheduleNext();
    }, this.speed);
  }

  private emit(): void {
    const step = this.replay.steps[this.currentStep];
    const deducedCells = new Map<string, 'filled' | 'empty'>();
    const activeClueIds = new Set<string>();

    for (const deduction of step.deductions) {
      deducedCells.set(coordKey(deduction.coord), deduction.result);
      for (const id of deduction.reason.clueIds) {
        activeClueIds.add(id);
      }
    }

    this.onChange(
      { deducedCells, activeClueIds, stuckCells: new Set() },
      this.currentStep,
      this.replay.steps.length,
    );
  }

  private emitStuck(): void {
    this.onChange(
      {
        deducedCells: new Map(),
        activeClueIds: new Set(),
        stuckCells: this.replay.stuckCells ?? new Set(),
      },
      this.currentStep,
      this.replay.steps.length,
    );
  }
}
