export const LAYOUT_TOOLBAR_TEMPLATE = `
    <div class="controls-group">
      <span class="controls-group-label">Layout</span>
      <div class="border-mode-group">
        <button
          id="layoutTopBig"
          class="toolbar-btn active"
          data-tooltip="Top view large, 3D small"
        >
          <app-icon name="map"></app-icon>
        </button>
        <button
          id="layoutCameraBig"
          class="toolbar-btn"
          data-tooltip="3D view large, Top view small"
        >
          <app-icon name="video"></app-icon>
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
          class="toolbar-btn view-toggle-btn active"
          data-tooltip="Show 3D perspective view"
        >
          <app-icon name="cube"></app-icon>
        </button>
        <button
          type="button"
          id="showVisualizer"
          class="toolbar-btn view-toggle-btn active"
          data-tooltip="Show neural network visualizer"
        >
          <app-icon name="brain"></app-icon>
        </button>
        <button
          type="button"
          id="showMiniMap"
          class="toolbar-btn view-toggle-btn active"
          data-tooltip="Show mini map"
        >
          <app-icon name="compass"></app-icon>
        </button>
      </div>
    </div>
`;
