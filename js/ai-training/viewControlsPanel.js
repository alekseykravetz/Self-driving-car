'use strict';
class ViewControlsPanelElement extends HTMLElement {
  _layoutMode = 'topview-big';
  onLayoutModeChange = null;
  onPanelToggle = null;
  constructor() {
    super();
    this.id = 'viewControls';
  }

  connectedCallback() {
    this.innerHTML = ViewControlsPanelElement.template;
    this.#initLayoutButtons();
    this.#initPanelToggles();
  }

  get layoutMode() {
    return this._layoutMode;
  }

  get showCameraView() {
    const el = this.querySelector('#showCameraView');
    return el ? el.checked : true;
  }

  get showVisualizer() {
    const el = this.querySelector('#showVisualizer');
    return el ? el.checked : true;
  }

  get showMiniMap() {
    const el = this.querySelector('#showMiniMap');
    return el ? el.checked : true;
  }

  get showCameraDebug() {
    const el = this.querySelector('#showCameraDebug');
    return el ? el.checked : false;
  }

  setLayoutModeListener(listener) {
    this.onLayoutModeChange = listener;
  }

  setPanelToggleListener(listener) {
    this.onPanelToggle = listener;
  }

  disableMiniMap() {
    const el = this.querySelector('#showMiniMap');
    if (el) {
      el.checked = false;
      el.disabled = true;
    }
  }

  hideCameraDebug() {
    const section = this.querySelector('#debugGroup');
    if (section) section.style.display = 'none';
    // Also hide the separator before it
    const sep = this.querySelector('#debugSeparator');
    if (sep) sep.style.display = 'none';
  }

  setDefaultLayoutMode(mode) {
    this._layoutMode = mode;
    const layoutTopBig = this.querySelector('#layoutTopBig');
    const layoutCameraBig = this.querySelector('#layoutCameraBig');
    if (layoutTopBig)
      layoutTopBig.classList.toggle('active', mode === 'topview-big');
    if (layoutCameraBig)
      layoutCameraBig.classList.toggle('active', mode === 'camera-big');
  }

  #initLayoutButtons() {
    const layoutTopBig = this.querySelector('#layoutTopBig');
    const layoutCameraBig = this.querySelector('#layoutCameraBig');
    const setLayout = (mode) => {
      this._layoutMode = mode;
      if (layoutTopBig)
        layoutTopBig.classList.toggle('active', mode === 'topview-big');
      if (layoutCameraBig)
        layoutCameraBig.classList.toggle('active', mode === 'camera-big');
      if (this.onLayoutModeChange) this.onLayoutModeChange(mode);
    };
    layoutTopBig?.addEventListener('click', () => setLayout('topview-big'));
    layoutCameraBig?.addEventListener('click', () => setLayout('camera-big'));
  }

  #initPanelToggles() {
    const checkboxes = this.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        if (this.onPanelToggle) this.onPanelToggle();
      });
    });
  }

  static template = `
    <div class="controls-group">
      <span class="controls-group-label">Layout</span>
      <div class="border-mode-group">
        <button
          id="layoutTopBig"
          class="border-mode-btn active"
          title="Top view large, 3D small"
        >
          🗺️
        </button>
        <button
          id="layoutCameraBig"
          class="border-mode-btn"
          title="3D view large, Top view small"
        >
          🎥
        </button>
      </div>
    </div>

    <div class="controls-separator"></div>

    <div class="controls-group">
      <span class="controls-group-label">Panels</span>
      <div class="view-toggles">
        <label class="view-toggle-label" title="Show 3D perspective view">
          <input type="checkbox" id="showCameraView" checked />
          <span>3D</span>
        </label>
        <label
          class="view-toggle-label"
          title="Show neural network visualizer"
        >
          <input type="checkbox" id="showVisualizer" checked />
          <span>Network</span>
        </label>
        <label class="view-toggle-label" title="Show mini map">
          <input type="checkbox" id="showMiniMap" checked />
          <span>Map</span>
        </label>
      </div>
    </div>

    <div class="controls-separator" id="debugSeparator"></div>

    <div class="controls-group" id="debugGroup">
      <span class="controls-group-label">Debug</span>
      <label class="view-toggle-label" title="Show camera debug overlay">
        <input type="checkbox" id="showCameraDebug" />
        <span>Cam</span>
      </label>
    </div>
  `;
}
customElements.define('view-controls-panel', ViewControlsPanelElement);
