import { ToolbarModeControls } from './modeControls.js';
import { ToolbarAssetSelectors } from './assetSelectors.js';
import { WORLD_TOOLBAR_TEMPLATE } from './templates/worldToolbarTemplate.js';
export class WorldToolbarElement extends HTMLElement {
  #modeControls;
  #assetSelectors;
  constructor() {
    super();
    this.id = 'topControls';
    this.#modeControls = new ToolbarModeControls(this);
    this.#assetSelectors = new ToolbarAssetSelectors(this);
  }
  connectedCallback() {
    this.innerHTML = WorldToolbarElement.template;
    this.#modeControls.init();
  }
  get borderMode() {
    return this.#modeControls.borderMode;
  }
  get trackingMode() {
    return this.#modeControls.trackingMode;
  }
  get viewportMode() {
    return this.#modeControls.viewportMode;
  }
  get showCameraDebug() {
    const el = this.querySelector('#showCameraDebug');
    return el ? el.checked : false;
  }
  hideCameraDebug() {
    this.hideGroups('debug', 'debug-sep');
  }
  setBorderModeListener(listener) {
    this.#modeControls.setBorderModeListener(listener);
  }
  setTrackingModeListener(listener) {
    this.#modeControls.setTrackingModeListener(listener);
  }
  setTrackingMode(mode) {
    this.#modeControls.setTrackingMode(mode);
  }
  setViewportModeListener(listener) {
    this.#modeControls.setViewportModeListener(listener);
  }
  showWorldEditorActions() {
    this.querySelectorAll('.world-editor-action').forEach((el) => {
      el.style.display = '';
    });
  }
  configureSelectors(opts) {
    this.#assetSelectors.configureSelectors(opts);
  }
  setCarSelectorMode(mode) {
    this.#assetSelectors.setCarSelectorMode(mode);
  }
  getSelectedCars() {
    return this.#assetSelectors.getSelectedCars();
  }
  refreshWorldList() {
    this.#assetSelectors.refreshWorldList();
  }
  refreshCarList() {
    this.#assetSelectors.refreshCarList();
  }
  hideGroups(...groups) {
    for (const name of groups) {
      const el = this.querySelector(`[data-group="${name}"]`);
      if (el) el.style.display = 'none';
    }
  }
  static template = WORLD_TOOLBAR_TEMPLATE;
}
customElements.define('world-toolbar', WorldToolbarElement);
