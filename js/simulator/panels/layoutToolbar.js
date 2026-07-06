'use strict';
class LayoutToolbarElement extends HTMLElement {
  #_layoutMode = 'topview-big';
  #onLayoutModeChange = null;
  #onPanelToggle = null;
  constructor() {
    super();
    this.id = 'layoutToolbar';
  }

  connectedCallback() {
    this.innerHTML = LayoutToolbarElement.template;
    this.#initLayoutButtons();
    this.#initPanelToggles();
  }

  get layoutMode() {
    return this.#_layoutMode;
  }

  get showCameraView() {
    const el = this.querySelector('#showCameraView');
    return el ? el.classList.contains('active') : true;
  }

  get showVisualizer() {
    const el = this.querySelector('#showVisualizer');
    return el ? el.classList.contains('active') : true;
  }

  get showMiniMap() {
    const el = this.querySelector('#showMiniMap');
    return el ? el.classList.contains('active') : true;
  }

  setLayoutModeListener(listener) {
    this.#onLayoutModeChange = listener;
  }

  setPanelToggleListener(listener) {
    this.#onPanelToggle = listener;
  }

  /**
   * Mobile defaults: uncheck the 3D view, network visualizer and mini-map so
   * only the top-down view is rendered on small screens. The layout-toolbar
   * panel itself is hidden via CSS; this clears the toggle state the layout
   * reads each frame.
   */
  applyMobileDefaults() {
    const cameraView = this.querySelector('#showCameraView');
    if (cameraView) cameraView.classList.remove('active');
    const visualizer = this.querySelector('#showVisualizer');
    if (visualizer) visualizer.classList.remove('active');
    const miniMap = this.querySelector('#showMiniMap');
    if (miniMap) miniMap.classList.remove('active');
  }

  setDefaultLayoutMode(mode) {
    this.#_layoutMode = mode;
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

  #initPanelToggles() {
    // Icon toggle buttons (3D / Network / Map) flip their `active` state the
    // same way the layout-mode buttons do.
    const toggleButtons = this.querySelectorAll('.view-toggle-btn');
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

  static template = LAYOUT_TOOLBAR_TEMPLATE;
}
customElements.define('layout-toolbar', LayoutToolbarElement);
