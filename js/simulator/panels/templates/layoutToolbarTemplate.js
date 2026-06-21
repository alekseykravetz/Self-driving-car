'use strict';
const LAYOUT_TOOLBAR_TEMPLATE = `
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
      <div class="border-mode-group">
        <button
          type="button"
          id="showCameraView"
          class="border-mode-btn view-toggle-btn active"
          title="Show 3D perspective view"
        >
          🧊
        </button>
        <button
          type="button"
          id="showVisualizer"
          class="border-mode-btn view-toggle-btn active"
          title="Show neural network visualizer"
        >
          🧠
        </button>
        <button
          type="button"
          id="showMiniMap"
          class="border-mode-btn view-toggle-btn active"
          title="Show mini map"
        >
          🧭
        </button>
      </div>
    </div>
`;
