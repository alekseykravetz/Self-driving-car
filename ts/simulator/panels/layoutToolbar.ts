type LayoutMode = 'topview-big' | 'camera-big';

class LayoutToolbarElement extends HTMLElement {
  #_layoutMode: LayoutMode = 'topview-big';

  #onLayoutModeChange: ((mode: LayoutMode) => void) | null = null;
  #onPanelToggle: (() => void) | null = null;

  constructor() {
    super();
    this.id = 'layoutToolbar';
  }

  connectedCallback(): void {
    this.innerHTML = LayoutToolbarElement.template;
    this.#initLayoutButtons();
    this.#initPanelToggles();
  }

  get layoutMode(): LayoutMode {
    return this.#_layoutMode;
  }

  get showCameraView(): boolean {
    const el = this.querySelector(
      '#showCameraView',
    ) as HTMLButtonElement | null;
    return el ? el.classList.contains('active') : true;
  }

  get showVisualizer(): boolean {
    const el = this.querySelector(
      '#showVisualizer',
    ) as HTMLButtonElement | null;
    return el ? el.classList.contains('active') : true;
  }

  get showMiniMap(): boolean {
    const el = this.querySelector('#showMiniMap') as HTMLButtonElement | null;
    return el ? el.classList.contains('active') : true;
  }

  setLayoutModeListener(listener: (mode: LayoutMode) => void): void {
    this.#onLayoutModeChange = listener;
  }

  setPanelToggleListener(listener: () => void): void {
    this.#onPanelToggle = listener;
  }

  /**
   * Mobile defaults: uncheck the 3D view, network visualizer and mini-map so
   * only the top-down view is rendered on small screens. The layout-toolbar
   * panel itself is hidden via CSS; this clears the toggle state the layout
   * reads each frame.
   */
  applyMobileDefaults(): void {
    const cameraView = this.querySelector(
      '#showCameraView',
    ) as HTMLButtonElement | null;
    if (cameraView) cameraView.classList.remove('active');
    const visualizer = this.querySelector(
      '#showVisualizer',
    ) as HTMLButtonElement | null;
    if (visualizer) visualizer.classList.remove('active');
    const miniMap = this.querySelector(
      '#showMiniMap',
    ) as HTMLButtonElement | null;
    if (miniMap) miniMap.classList.remove('active');
  }

  setDefaultLayoutMode(mode: LayoutMode): void {
    this.#_layoutMode = mode;
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
      this.#_layoutMode = mode;
      if (layoutTopBig)
        layoutTopBig.classList.toggle('active', mode === 'topview-big');
      if (layoutCameraBig)
        layoutCameraBig.classList.toggle('active', mode === 'camera-big');
      if (this.#onLayoutModeChange) this.#onLayoutModeChange(mode);
    };

    layoutTopBig?.addEventListener('click', () => setLayout('topview-big'));
    layoutCameraBig?.addEventListener('click', () => setLayout('camera-big'));
  }

  #initPanelToggles(): void {
    // Icon toggle buttons (3D / Network / Map) flip their `active` state the
    // same way the layout-mode buttons do.
    const toggleButtons =
      this.querySelectorAll<HTMLButtonElement>('.view-toggle-btn');
    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.classList.toggle('active');
        if (this.#onPanelToggle) this.#onPanelToggle();
      });
    });

    // Remaining checkbox toggles (e.g. camera debug overlay).
    const checkboxes = this.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        if (this.#onPanelToggle) this.#onPanelToggle();
      });
    });
  }

  static readonly template = LAYOUT_TOOLBAR_TEMPLATE;
}

customElements.define('layout-toolbar', LayoutToolbarElement);
