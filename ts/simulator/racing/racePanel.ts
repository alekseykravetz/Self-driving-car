import type { WorldToolbarElement } from '../../panels/worldToolbar.js';
import type { UnifiedWorldEntry } from '../../store/types.js';
import type { BorderMode, TrackingMode } from '../../panels/modeControls.js';
import type { Car } from '../../car/car.js';
import { beep } from '../../audio/sound.js';

export class RacePanel {
  toolbarPanel: WorldToolbarElement;
  statistics: HTMLElement;
  counter: HTMLElement;
  element!: HTMLElement;

  constructor() {
    this.toolbarPanel = document.querySelector(
      'world-toolbar',
    ) as WorldToolbarElement;
    this.statistics = document.getElementById('statistics')!;
    this.counter = document.getElementById('counter')!;
  }

  configureToolbar(config: {
    carMode: 'multi' | 'single';
    onWorldSelected: (entry: UnifiedWorldEntry | null) => void;
    onViewportModeChange: (mode: 'mouse' | 'touchpad') => void;
  }): void {
    this.toolbarPanel.setViewportModeListener(config.onViewportModeChange);
    this.toolbarPanel.configureSelectors({
      carMode: config.carMode,
      onWorldSelected: config.onWorldSelected,
    });
    this.toolbarPanel.hideCameraDebug();
  }

  setTrackingMode(mode: TrackingMode): void {
    this.toolbarPanel.setTrackingMode(mode);
  }

  get trackingMode(): TrackingMode {
    return this.toolbarPanel.trackingMode;
  }

  get borderMode(): BorderMode {
    return this.toolbarPanel.borderMode;
  }

  get viewportMode(): 'mouse' | 'touchpad' {
    return this.toolbarPanel.viewportMode;
  }

  createPanel(onRestart: () => void): void {
    this.element = document.createElement('div');
    this.element.id = 'racePanel';

    const group = document.createElement('div');
    group.className = 'controls-group';

    const label = document.createElement('span');
    label.className = 'controls-group-label';
    label.textContent = 'Race';

    const restartBtn = document.createElement('button');
    restartBtn.id = 'restartRaceBtn';
    restartBtn.style.margin = '0';
    restartBtn.textContent = '🔄 Restart';
    restartBtn.className = 'race-panel-btn';
    restartBtn.addEventListener('click', onRestart);

    group.appendChild(label);
    group.appendChild(restartBtn);
    this.element.appendChild(group);

    const toolbar =
      document.getElementById('simulatorToolbar') ?? document.body;
    toolbar.appendChild(this.element);
  }

  createStatistics(cars: Car[]): void {
    this.statistics.innerHTML = '';
    for (let i = 0; i < cars.length; i++) {
      const div = document.createElement('div');
      div.id = 'stat_' + i;
      div.innerText = String(i);
      div.style.color = cars[i].color;
      div.classList.add('stat');
      this.statistics.appendChild(div);
    }
  }

  updateStatistics(cars: Car[]): void {
    for (let i = 0; i < cars.length; i++) {
      const stat = document.getElementById('stat_' + i) as HTMLElement;
      if (!stat) continue;
      stat.style.color = cars[i].type === 'AI' ? 'white' : cars[i].color;
      stat.innerText = `${i + 1}: ${cars[i].name} ${cars[i].damaged ? '💀' : ''}`;
      stat.style.backgroundColor = cars[i].type === 'AI' ? 'black' : 'white';
      if (cars[i].finishTime) {
        stat.innerHTML +=
          '<span style="float: right;">' +
          (cars[i].finishTime! / 60).toFixed(1) +
          's </span>';
      }
    }
  }

  startCounter(onStarted: () => void): void {
    if (!this.counter) return;

    this.counter.innerText = '3';
    beep(400);
    setTimeout(() => {
      if (!this.counter) return;
      this.counter.innerText = '2';
      beep(400);
      setTimeout(() => {
        if (!this.counter) return;
        this.counter.innerText = '1';
        beep(400);
        setTimeout(() => {
          if (!this.counter) return;
          this.counter.innerText = 'GO!';
          beep(700);
          setTimeout(() => {
            if (!this.counter) return;
            this.counter.innerText = '';
            onStarted();
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }
}
