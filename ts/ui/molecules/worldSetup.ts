import type { BorderMode } from '../../simulator/types.js';
import { ToolbarModeControls } from './modeControls.js';
import type { TrackingMode } from '../../simulator/types.js';
import type { ToolbarViewportMode } from './modeControls.js';
import { ToolbarAssetSelectors } from './assetSelectors.js';
import type { UnifiedWorldEntry } from '../../store/types.js';
import type { CarInfo } from '../../car/car.js';
import { makeToolbarCollapsible } from '../atoms/collapsibleToolbar.js';
import { WORLD_SETUP_TEMPLATE } from './worldSetupTemplate.js';

export class WorldSetupElement extends HTMLElement {
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
    this.innerHTML = WorldSetupElement.template;
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

    makeToolbarCollapsible(this, 'Setup');
  }

  get borderMode(): BorderMode {
    return this.#modeControls.borderMode;
  }

  get trackingMode(): TrackingMode {
    return this.#modeControls.trackingMode;
  }

  get trackingCarIndex(): number {
    return this.#modeControls.trackingCarIndex;
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

  setTrackingCarListener(listener: (index: number) => void): void {
    this.#modeControls.setTrackingCarListener(listener);
  }

  setTrackingCarDisplay(index: number, count: number, name?: string): void {
    this.#modeControls.setTrackingCarDisplay(index, count, name);
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

  hideSelectedCarRow(): void {
    this.#assetSelectors.hideSelectedCarRow();
  }

  hideSelectedWorldRow(): void {
    this.#assetSelectors.hideSelectedWorldRow();
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

  showOnlyGroups(...groups: string[]): void {
    const visibleGroups = new Set(groups);
    this.querySelectorAll<HTMLElement>('[data-group]').forEach((el) => {
      el.style.display = visibleGroups.has(el.dataset.group ?? '')
        ? ''
        : 'none';
    });
  }

  static readonly template = WORLD_SETUP_TEMPLATE;
}

customElements.define('world-setup', WorldSetupElement);
