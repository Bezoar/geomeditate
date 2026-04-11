import type { TraceStep } from '../solver/types';

export interface ReplayCallbacks {
  onStepChange: (step: TraceStep, index: number) => void;
}

export interface ReplayControlsAPI {
  setTrace: (trace: TraceStep[]) => void;
  hide: () => void;
}

function formatPhase(step: TraceStep): string {
  const suffix = ` \u2014 ${step.actionableClueCount} actionable clue${step.actionableClueCount === 1 ? '' : 's'} remain`;
  if (step.phase === 'clue-activation' && step.clueActivated) {
    const a = step.clueActivated;
    return `Clue Activated: ${a.label} \u2014 ${a.reason}${suffix}`;
  }
  if (step.phase === 'deduction' && step.deduction) {
    const d = step.deduction;
    return `Deduced: ${d.cellResolved} is ${d.resolvedTo} via ${d.clueLabel} \u2014 ${d.deductionType}${suffix}`;
  }
  if (step.phase === 'endgame' && step.endgame) {
    const e = step.endgame;
    const count = e.cellsResolved.length;
    const desc = e.type === 'all-filled' ? 'all filled' : 'all empty';
    return `Endgame: ${count} remaining cells ${desc}${suffix}`;
  }
  return '';
}

function formatClueIds(step: TraceStep): string {
  if (step.actionableClueIds.length === 0) return '';
  return `Actionable: ${step.actionableClueIds.join(', ')}`;
}

export function initReplayControls(
  container: HTMLElement,
  callbacks: ReplayCallbacks,
): ReplayControlsAPI {
  let trace: TraceStep[] = [];
  let currentIndex = 0;

  const rewindBtn = document.createElement('button');
  rewindBtn.textContent = '|\u25C0';
  rewindBtn.title = 'Rewind to start';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '\u25C0 Prev';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next \u25B6';
  const fastForwardBtn = document.createElement('button');
  fastForwardBtn.textContent = '\u25B6|';
  fastForwardBtn.title = 'Fast-forward to end';
  const stepInfo = document.createElement('div');
  stepInfo.className = 'step-info';
  const phaseInfo = document.createElement('div');
  phaseInfo.className = 'phase-info';
  const clueIdsInfo = document.createElement('div');
  clueIdsInfo.className = 'clue-ids-info';
  clueIdsInfo.style.fontSize = '12px';
  clueIdsInfo.style.opacity = '0.6';
  clueIdsInfo.style.marginTop = '4px';
  clueIdsInfo.style.wordBreak = 'break-all';

  container.appendChild(rewindBtn);
  container.appendChild(prevBtn);
  container.appendChild(nextBtn);
  container.appendChild(fastForwardBtn);
  container.appendChild(stepInfo);
  container.appendChild(phaseInfo);
  container.appendChild(clueIdsInfo);

  function updateDisplay(): void {
    if (trace.length === 0) {
      stepInfo.textContent = 'No steps';
      phaseInfo.textContent = '';
      clueIdsInfo.textContent = '';
      rewindBtn.disabled = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      fastForwardBtn.disabled = true;
      return;
    }
    stepInfo.textContent = `Step ${currentIndex + 1} / ${trace.length}`;
    phaseInfo.textContent = formatPhase(trace[currentIndex]);
    clueIdsInfo.textContent = formatClueIds(trace[currentIndex]);
    rewindBtn.disabled = currentIndex === 0;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === trace.length - 1;
    fastForwardBtn.disabled = currentIndex === trace.length - 1;
  }

  rewindBtn.addEventListener('click', () => {
    if (currentIndex !== 0) {
      currentIndex = 0;
      updateDisplay();
      callbacks.onStepChange(trace[currentIndex], currentIndex);
    }
  });

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

  fastForwardBtn.addEventListener('click', () => {
    if (currentIndex !== trace.length - 1) {
      currentIndex = trace.length - 1;
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
