type LayoutMode = 'topview-big' | 'camera-big';

class ViewControlsPanelElement extends HTMLElement {
  private _layoutMode: LayoutMode = 'topview-big';

  private onLayoutModeChange: ((mode: LayoutMode) => void) | null = null;
  private onPanelToggle: (() => void) | null = null;

  constructor() {
    super();
    this.id = 'viewControls';
  }

  connectedCallback(): void {
    this.innerHTML = ViewControlsPanelElement.template;
    this.#initLayoutButtons();
    this.#initPanelToggles();
  }

  get layoutMode(): LayoutMode {
    return this._layoutMode;
  }

  get showCameraView(): boolean {
    const el = this.querySelector('#showCameraView') as HTMLInputElement | null;
    return el ? el.checked : true;
  }

  get showVisualizer(): boolean {
    const el = this.querySelector('#showVisualizer') as HTMLInputElement | null;
    return el ? el.checked : true;
  }

  get showMiniMap(): boolean {
    const el = this.querySelector('#showMiniMap') as HTMLInputElement | null;
    return el ? el.checked : true;
  }

  get showCameraDebug(): boolean {
    const el = this.querySelector(
      '#showCameraDebug',
    ) as HTMLInputElement | null;
    return el ? el.checked : false;
  }

  setLayoutModeListener(listener: (mode: LayoutMode) => void): void {
    this.onLayoutModeChange = listener;
  }

  setPanelToggleListener(listener: () => void): void {
    this.onPanelToggle = listener;
  }

  disableMiniMap(): void {
    const el = this.querySelector('#showMiniMap') as HTMLInputElement | null;
    if (el) {
      el.checked = false;
      el.disabled = true;
    }
  }

  hideCameraDebug(): void {
    const section = this.querySelector('#debugGroup') as HTMLElement | null;
    if (section) section.style.display = 'none';
    // Also hide the separator before it
    const sep = this.querySelector('#debugSeparator') as HTMLElement | null;
    if (sep) sep.style.display = 'none';
  }

  setDefaultLayoutMode(mode: LayoutMode): void {
    this._layoutMode = mode;
    const layoutTopBig = this.querySelector(
      '#layoutTopBig',
    ) as HTMLButtonElement | null;
    const layoutCameraBig = this.querySelector(
      '#layoutCameraBig',
    ) as HTMLButtonElement | null;
    if (layoutTopBig)
      layoutTopBig.classList.toggle('active', mode === 'topview-big');
    if (layoutCameraBig)
      layoutCameraBig.classList.toggle('active', mode === 'camera-big');
  }

  #initLayoutButtons(): void {
    const layoutTopBig = this.querySelector(
      '#layoutTopBig',
    ) as HTMLButtonElement | null;
    const layoutCameraBig = this.querySelector(
      '#layoutCameraBig',
    ) as HTMLButtonElement | null;

    const setLayout = (mode: LayoutMode) => {
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

  #initPanelToggles(): void {
    const checkboxes = this.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        if (this.onPanelToggle) this.onPanelToggle();
      });
    });
  }

  static readonly template = `
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
