import { DEFAULT_CONFIG } from '../solver/config';
import type { SolverConfig, DeductionLevels, ClueWeights } from '../solver/types';

export interface SettingsCallbacks {
  onSolve: (config: SolverConfig) => void;
  onCancel: () => void;
}

export interface SettingsModalAPI {
  open: () => void;
  getConfig: () => SolverConfig;
}

interface DeductionCheckbox {
  key: keyof DeductionLevels;
  label: string;
  input: HTMLInputElement;
}

export function initSettingsModal(
  modalEl: HTMLElement,
  overlayEl: HTMLElement,
  callbacks: SettingsCallbacks,
): SettingsModalAPI {
  let currentConfig: SolverConfig = structuredClone(DEFAULT_CONFIG);

  // Build modal contents
  const heading = document.createElement('h2');
  heading.textContent = 'Solver Settings';
  modalEl.appendChild(heading);

  // Seed
  const seedLabel = document.createElement('label');
  seedLabel.textContent = 'Seed';
  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.value = currentConfig.seed;
  modalEl.appendChild(seedLabel);
  modalEl.appendChild(seedInput);

  // Difficulty
  const diffLabel = document.createElement('label');
  diffLabel.textContent = 'Difficulty';
  const diffSelect = document.createElement('select');
  const easyOpt = document.createElement('option');
  easyOpt.value = 'easy';
  easyOpt.textContent = 'Easy';
  const hardOpt = document.createElement('option');
  hardOpt.value = 'hard';
  hardOpt.textContent = 'Hard';
  diffSelect.appendChild(easyOpt);
  diffSelect.appendChild(hardOpt);
  diffSelect.value = currentConfig.difficulty;
  modalEl.appendChild(diffLabel);
  modalEl.appendChild(diffSelect);

  // Deduction levels
  const deductionLabel = document.createElement('label');
  deductionLabel.textContent = 'Deduction Levels';
  modalEl.appendChild(deductionLabel);

  const deductionDefs: { key: keyof DeductionLevels; label: string }[] = [
    { key: 'trivial', label: 'Trivial (count + elimination)' },
    { key: 'contiguity', label: 'Contiguity' },
    { key: 'lineSegment', label: 'Line Segment' },
    { key: 'flower', label: 'Flower' },
    { key: 'pairwiseIntersection', label: 'Pairwise Intersection' },
    { key: 'constraintPropagation', label: 'Constraint Propagation' },
    { key: 'setReasoning', label: 'Set Reasoning' },
  ];

  const deductionCheckboxes: DeductionCheckbox[] = deductionDefs.map(def => {
    const row = document.createElement('div');
    row.className = 'checkbox-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = currentConfig.deductionLevels[def.key];
    const span = document.createElement('span');
    span.textContent = def.label;
    row.appendChild(cb);
    row.appendChild(span);
    modalEl.appendChild(row);
    return { key: def.key, label: def.label, input: cb };
  });

  // Clue weights helper
  function createWeightSlider(
    container: HTMLElement,
    label: string,
    value: number,
  ): HTMLInputElement {
    const row = document.createElement('div');
    row.className = 'weight-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.minWidth = '60px';
    lbl.style.fontSize = '13px';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(value);
    slider.style.flex = '1';
    const valSpan = document.createElement('span');
    valSpan.textContent = String(value);
    slider.addEventListener('input', () => {
      valSpan.textContent = slider.value;
    });
    row.appendChild(lbl);
    row.appendChild(slider);
    row.appendChild(valSpan);
    container.appendChild(row);
    return slider;
  }

  // Easy weights
  const easyWeightsLabel = document.createElement('label');
  easyWeightsLabel.textContent = 'Clue Weights (Easy)';
  modalEl.appendChild(easyWeightsLabel);
  const easyCellSlider = createWeightSlider(modalEl, 'Cell', currentConfig.clueWeights.easy.cell);
  const easyLineSlider = createWeightSlider(modalEl, 'Line', currentConfig.clueWeights.easy.line);
  const easyFlowerSlider = createWeightSlider(modalEl, 'Flower', currentConfig.clueWeights.easy.flower);

  // Hard weights
  const hardWeightsLabel = document.createElement('label');
  hardWeightsLabel.textContent = 'Clue Weights (Hard)';
  modalEl.appendChild(hardWeightsLabel);
  const hardCellSlider = createWeightSlider(modalEl, 'Cell', currentConfig.clueWeights.hard.cell);
  const hardLineSlider = createWeightSlider(modalEl, 'Line', currentConfig.clueWeights.hard.line);
  const hardFlowerSlider = createWeightSlider(modalEl, 'Flower', currentConfig.clueWeights.hard.flower);

  // Min actionable inputs
  const easyMinLabel = document.createElement('label');
  easyMinLabel.textContent = 'Easy Mode Min Actionable';
  const easyMinInput = document.createElement('input');
  easyMinInput.type = 'number';
  easyMinInput.min = '0';
  easyMinInput.value = String(currentConfig.easyModeMinActionable);
  modalEl.appendChild(easyMinLabel);
  modalEl.appendChild(easyMinInput);

  const hardMinLabel = document.createElement('label');
  hardMinLabel.textContent = 'Hard Mode Min Actionable';
  const hardMinInput = document.createElement('input');
  hardMinInput.type = 'number';
  hardMinInput.min = '0';
  hardMinInput.value = String(currentConfig.hardModeMinActionable);
  modalEl.appendChild(hardMinLabel);
  modalEl.appendChild(hardMinInput);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    overlayEl.classList.remove('open');
    callbacks.onCancel();
  });

  const solveBtn = document.createElement('button');
  solveBtn.className = 'primary';
  solveBtn.textContent = 'Solve';
  solveBtn.addEventListener('click', () => {
    currentConfig = readConfig();
    overlayEl.classList.remove('open');
    callbacks.onSolve(currentConfig);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(solveBtn);
  modalEl.appendChild(btnRow);

  function readConfig(): SolverConfig {
    const deductionLevels: DeductionLevels = {
      trivial: true,
      contiguity: true,
      lineSegment: true,
      flower: true,
      pairwiseIntersection: true,
      constraintPropagation: true,
      setReasoning: true,
    };
    for (const cb of deductionCheckboxes) {
      deductionLevels[cb.key] = cb.input.checked;
    }

    const easyWeights: ClueWeights = {
      cell: Number(easyCellSlider.value),
      line: Number(easyLineSlider.value),
      flower: Number(easyFlowerSlider.value),
    };
    const hardWeights: ClueWeights = {
      cell: Number(hardCellSlider.value),
      line: Number(hardLineSlider.value),
      flower: Number(hardFlowerSlider.value),
    };

    return {
      seed: seedInput.value,
      difficulty: diffSelect.value as 'easy' | 'hard',
      deductionLevels,
      clueWeights: { easy: easyWeights, hard: hardWeights },
      easyModeMinActionable: Number(easyMinInput.value),
      hardModeMinActionable: Number(hardMinInput.value),
    };
  }

  function open(): void {
    // Sync UI to current config
    seedInput.value = currentConfig.seed;
    diffSelect.value = currentConfig.difficulty;
    for (const cb of deductionCheckboxes) {
      cb.input.checked = currentConfig.deductionLevels[cb.key];
    }
    easyCellSlider.value = String(currentConfig.clueWeights.easy.cell);
    easyLineSlider.value = String(currentConfig.clueWeights.easy.line);
    easyFlowerSlider.value = String(currentConfig.clueWeights.easy.flower);
    hardCellSlider.value = String(currentConfig.clueWeights.hard.cell);
    hardLineSlider.value = String(currentConfig.clueWeights.hard.line);
    hardFlowerSlider.value = String(currentConfig.clueWeights.hard.flower);
    easyMinInput.value = String(currentConfig.easyModeMinActionable);
    hardMinInput.value = String(currentConfig.hardModeMinActionable);
    overlayEl.classList.add('open');
  }

  return { open, getConfig: readConfig };
}
