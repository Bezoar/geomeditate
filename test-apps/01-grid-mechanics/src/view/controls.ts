export interface ControlsConfig {
  gridNames: string[];
  onGridSelect: (index: number) => void;
  onContiguityToggle: (enabled: boolean) => void;
  onRestart: () => void;
  onCoverAll: () => void;
  onRandomGenerate: (width: number, height: number, density: number) => void;
}

export function initControls(container: HTMLElement, config: ControlsConfig): void {
  // Grid selector
  const select = document.createElement('select');
  for (let i = 0; i < config.gridNames.length; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = config.gridNames[i];
    select.appendChild(option);
  }
  select.addEventListener('change', () => {
    config.onGridSelect(Number(select.value));
  });
  container.appendChild(select);

  // Restart button
  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Restart';
  restartBtn.addEventListener('click', config.onRestart);
  container.appendChild(restartBtn);

  // Cover All button
  const coverBtn = document.createElement('button');
  coverBtn.textContent = 'Cover All';
  coverBtn.addEventListener('click', config.onCoverAll);
  container.appendChild(coverBtn);

  // Contiguity toggle
  const contiguityLabel = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.addEventListener('change', () => {
    config.onContiguityToggle(checkbox.checked);
  });
  contiguityLabel.appendChild(checkbox);
  contiguityLabel.appendChild(document.createTextNode(' Contiguity'));
  container.appendChild(contiguityLabel);

  // Separator
  const separator = document.createElement('span');
  separator.textContent = '|';
  separator.style.opacity = '0.3';
  container.appendChild(separator);

  // Random grid controls
  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.value = '6';
  widthInput.min = '1';
  widthInput.max = '20';
  widthInput.title = 'Width';

  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.value = '5';
  heightInput.min = '1';
  heightInput.max = '20';
  heightInput.title = 'Height';

  const densityInput = document.createElement('input');
  densityInput.type = 'range';
  densityInput.min = '0';
  densityInput.max = '100';
  densityInput.value = '33';
  densityInput.title = 'Fill density';

  const densityLabel = document.createElement('label');
  densityLabel.textContent = '33%';
  densityInput.addEventListener('input', () => {
    densityLabel.textContent = `${densityInput.value}%`;
  });

  const generateBtn = document.createElement('button');
  generateBtn.textContent = 'Random';
  generateBtn.addEventListener('click', () => {
    config.onRandomGenerate(
      Number(widthInput.value),
      Number(heightInput.value),
      Number(densityInput.value) / 100,
    );
  });

  container.appendChild(widthInput);
  container.appendChild(document.createTextNode('\u00d7'));
  container.appendChild(heightInput);
  container.appendChild(densityInput);
  container.appendChild(densityLabel);
  container.appendChild(generateBtn);
}
