import type { BorderMode } from '../../simulator/types.js';
import { ToolbarModeControls } from './modeControls.js';
import type { TrackingMode, ToolbarViewportMode } from './modeControls.js';
import { ToolbarAssetSelectors } from './assetSelectors.js';
import type { UnifiedWorldEntry } from '../../store/types.js';
import type { CarInfo } from '../../car/car.js';
import { WORLD_TOOLBAR_TEMPLATE } from './worldToolbarTemplate.js';

export class WorldToolbarElement extends HTMLElement {
  #modeControls: ToolbarModeControls;
  #assetSelectors: ToolbarAssetSelectors;
  #_showCameraDebug: boolean = false;

  constructor() {
    super();
    this.id = 'topControls';
    this.#modeControls = new ToolbarModeControls(this);
    this.#assetSelectors = new ToolbarAssetSelectors(this);
  }

  connectedCallback(): void {
    this.innerHTML = WorldToolbarElement.template;
    this.#modeControls.init();

    const debugCb = this.querySelector(
      '#showCameraDebug',
    ) as HTMLInputElement | null;
    if (debugCb) {
      this.#_showCameraDebug = debugCb.checked;
      debugCb.addEventListener('change', () => {
        this.#_showCameraDebug = debugCb.checked;
      });
    }
  }

  get borderMode(): BorderMode {
    return this.#modeControls.borderMode;
  }

  get trackingMode(): TrackingMode {
    return this.#modeControls.trackingMode;
  }

  get viewportMode(): ToolbarViewportMode {
    return this.#modeControls.viewportMode;
  }

  get showCameraDebug(): boolean {
    return this.#_showCameraDebug;
  }

  hideCameraDebug(): void {
    this.hideGroups('debug', 'debug-sep');
  }

  setBorderModeListener(listener: (mode: BorderMode) => void): void {
    this.#modeControls.setBorderModeListener(listener);
  }

  setTrackingModeListener(listener: (mode: TrackingMode) => void): void {
    this.#modeControls.setTrackingModeListener(listener);
  }

  setTrackingMode(mode: TrackingMode): void {
    this.#modeControls.setTrackingMode(mode);
  }

  setViewportModeListener(listener: (mode: ToolbarViewportMode) => void): void {
    this.#modeControls.setViewportModeListener(listener);
  }

  showWorldEditorActions(): void {
    this.querySelectorAll<HTMLElement>('.world-editor-action').forEach((el) => {
      el.style.display = '';
    });
  }

  configureSelectors(opts: {
    carMode?: 'multi' | 'single';
    selectOnWorldFileLoad?: boolean;
    onWorldSelected?: (entry: UnifiedWorldEntry | null) => void;
    onCarsSelected?: (cars: CarInfo[]) => void;
  }): void {
    this.#assetSelectors.configureSelectors(opts);
  }

  setCarSelectorMode(mode: 'multi' | 'single'): void {
    this.#assetSelectors.setCarSelectorMode(mode);
  }

  getSelectedCars(): CarInfo[] {
    return this.#assetSelectors.getSelectedCars();
  }

  refreshWorldList(): void {
    this.#assetSelectors.refreshWorldList();
  }

  refreshCarList(): void {
    this.#assetSelectors.refreshCarList();
  }

  hideGroups(...groups: string[]): void {
    for (const name of groups) {
      const el = this.querySelector(`[data-group="${name}"]`);
      if (el) (el as HTMLElement).style.display = 'none';
    }
  }

  static readonly template = WORLD_TOOLBAR_TEMPLATE;
}

customElements.define('world-toolbar', WorldToolbarElement);
