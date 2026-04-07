let remainingEl: HTMLSpanElement;
let mistakesEl: HTMLSpanElement;

export function initCounters(container: HTMLElement): void {
  container.innerHTML = '';

  const remainingGroup = document.createElement('span');
  remainingGroup.className = 'counter-group';
  const remainingLabel = document.createElement('span');
  remainingLabel.className = 'counter-label';
  remainingLabel.textContent = 'Remaining:';
  remainingEl = document.createElement('span');
  remainingEl.id = 'remaining';
  remainingEl.textContent = '0';
  remainingGroup.appendChild(remainingLabel);
  remainingGroup.appendChild(remainingEl);

  const mistakesGroup = document.createElement('span');
  mistakesGroup.className = 'counter-group';
  const mistakesLabel = document.createElement('span');
  mistakesLabel.className = 'counter-label';
  mistakesLabel.textContent = 'Mistakes:';
  mistakesEl = document.createElement('span');
  mistakesEl.id = 'mistakes';
  mistakesEl.textContent = '0';
  mistakesGroup.appendChild(mistakesLabel);
  mistakesGroup.appendChild(mistakesEl);

  container.appendChild(remainingGroup);
  container.appendChild(mistakesGroup);
}

export function updateCounters(remaining: number, mistakes: number): void {
  remainingEl.textContent = String(remaining);
  mistakesEl.textContent = String(mistakes);
}
