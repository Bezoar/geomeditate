import type { TraceStep } from '../solver/types';

export interface ReplayCallbacks {
  onStepChange: (step: TraceStep, index: number) => void;
}

export interface ReplayControlsAPI {
  setTrace: (trace: TraceStep[]) => void;
  hide: () => void;
}

function formatPhase(step: TraceStep): string {
  if (step.phase === 'clue-activation' && step.clueActivated) {
    const a = step.clueActivated;
    return `Clue Activated: ${a.type} at ${a.id} \u2014 ${a.reason}`;
  }
  if (step.phase === 'deduction' && step.deduction) {
    const d = step.deduction;
    return `Deduced: ${d.cellResolved} is ${d.resolvedTo} \u2014 ${d.deductionType}`;
  }
  if (step.phase === 'endgame' && step.endgame) {
    const e = step.endgame;
    const count = e.cellsResolved.length;
    const desc = e.type === 'all-filled' ? 'all filled' : 'all empty';
    return `Endgame: ${count} remaining cells ${desc}`;
  }
  return '';
}

export function initReplayControls(
  container: HTMLElement,
  callbacks: ReplayCallbacks,
): ReplayControlsAPI {
  let trace: TraceStep[] = [];
  let currentIndex = 0;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '\u25C0 Prev';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next \u25B6';
  const stepInfo = document.createElement('div');
  stepInfo.className = 'step-info';
  const phaseInfo = document.createElement('div');
  phaseInfo.className = 'phase-info';

  container.appendChild(prevBtn);
  container.appendChild(nextBtn);
  container.appendChild(stepInfo);
  container.appendChild(phaseInfo);

  function updateDisplay(): void {
    if (trace.length === 0) {
      stepInfo.textContent = 'No steps';
      phaseInfo.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    stepInfo.textContent = `Step ${currentIndex + 1} / ${trace.length}`;
    phaseInfo.textContent = formatPhase(trace[currentIndex]);
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === trace.length - 1;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateDisplay();
      callbacks.onStepChange(trace[currentIndex], currentIndex);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < trace.length - 1) {
      currentIndex++;
      updateDisplay();
      callbacks.onStepChange(trace[currentIndex], currentIndex);
    }
  });

  function setTrace(newTrace: TraceStep[]): void {
    trace = newTrace;
    currentIndex = trace.length > 0 ? trace.length - 1 : 0;
    container.classList.add('active');
    updateDisplay();
    if (trace.length > 0) {
      callbacks.onStepChange(trace[currentIndex], currentIndex);
    }
  }

  function hide(): void {
    container.classList.remove('active');
  }

  updateDisplay();
  return { setTrace, hide };
}
