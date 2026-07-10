import { LAYOUT_TOOLBAR_TEMPLATE } from './templates/layoutToolbarTemplate.js';
export class LayoutToolbarElement extends HTMLElement {
    #_layoutMode = 'topview-big';
    #_showCameraView = true;
    #_showVisualizer = true;
    #_showMiniMap = true;
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
        this.#syncCachedFromDOM();
    }
    get layoutMode() {
        return this.#_layoutMode;
    }
    get showCameraView() {
        return this.#_showCameraView;
    }
    get showVisualizer() {
        return this.#_showVisualizer;
    }
    get showMiniMap() {
        return this.#_showMiniMap;
    }
    setLayoutModeListener(listener) {
        this.#onLayoutModeChange = listener;
    }
    setPanelToggleListener(listener) {
        this.#onPanelToggle = listener;
    }
    #syncCachedFromDOM() {
        const cv = this.querySelector('#showCameraView');
        this.#_showCameraView = cv ? cv.classList.contains('active') : true;
        const vis = this.querySelector('#showVisualizer');
        this.#_showVisualizer = vis ? vis.classList.contains('active') : true;
        const mm = this.querySelector('#showMiniMap');
        this.#_showMiniMap = mm ? mm.classList.contains('active') : true;
    }
    /** Update cached state from a button's classList. */
    #updateToggleCache(btn) {
        switch (btn.id) {
            case 'showCameraView':
                this.#_showCameraView = btn.classList.contains('active');
                break;
            case 'showVisualizer':
                this.#_showVisualizer = btn.classList.contains('active');
                break;
            case 'showMiniMap':
                this.#_showMiniMap = btn.classList.contains('active');
                break;
        }
    }
    /**
     * Mobile defaults: uncheck the 3D view, network visualizer and mini-map so
     * only the top-down view is rendered on small screens.
     */
    applyMobileDefaults() {
        const cameraView = this.querySelector('#showCameraView');
        if (cameraView)
            cameraView.classList.remove('active');
        const visualizer = this.querySelector('#showVisualizer');
        if (visualizer)
            visualizer.classList.remove('active');
        const miniMap = this.querySelector('#showMiniMap');
        if (miniMap)
            miniMap.classList.remove('active');
        this.#syncCachedFromDOM();
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
            if (this.#onLayoutModeChange)
                this.#onLayoutModeChange(mode);
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
                if (btn.disabled)
                    return;
                btn.classList.toggle('active');
                this.#updateToggleCache(btn);
                if (this.#onPanelToggle)
                    this.#onPanelToggle();
            });
        });
        // Remaining checkbox toggles (e.g. camera debug overlay).
        const checkboxes = this.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb) => {
            cb.addEventListener('change', () => {
                if (this.#onPanelToggle)
                    this.#onPanelToggle();
            });
        });
    }
    static template = LAYOUT_TOOLBAR_TEMPLATE;
}
customElements.define('layout-toolbar', LayoutToolbarElement);
