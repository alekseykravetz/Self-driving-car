const WORLD_TOOLBAR_TEMPLATE = `
    <div class="controls-group" data-group="world">
      <span class="controls-group-label">World</span>
      <div class="border-mode-group">
        <div class="asset-picker" data-picker="world">
          <button
            type="button"
            id="loadWorldBtn"
            class="top-controls-btn"
            title="Load / select world"
          >
            📁
          </button>
          <div id="worldPicker" class="asset-popover" hidden>
            <label for="loadWorldInput" class="file-input-label asset-load-btn">
              📁 Load from file
              <input type="file" id="loadWorldInput" accept=".world" />
            </label>
            <div id="worldPickerList" class="asset-list"></div>
          </div>
        </div>
        <button
          id="saveBtn"
          class="top-controls-btn world-editor-action"
          title="Save — Save world to file and localStorage"
          style="display: none"
        >
          💾
        </button>
        <button
          id="disposeBtn"
          class="top-controls-btn world-editor-action"
          title="Dispose — Clear all graph points and segments"
          style="display: none"
        >
          🗑️
        </button>
        <button
          id="openOsmPanelBtn"
          class="top-controls-btn world-editor-action"
          title="OSM Import — Paste OpenStreetMap data to generate roads"
          style="display: none"
        >
          🗺️
        </button>
      </div>
    </div>

    <div class="controls-group" data-group="car">
      <span class="controls-group-label">Car</span>
      <div class="asset-picker" data-picker="car">
        <button
          type="button"
          id="loadCarBtn"
          class="top-controls-btn"
          title="Load / select car(s)"
        >
          🚗
        </button>
        <div id="carPicker" class="asset-popover" hidden>
          <label for="loadCarInput" class="file-input-label asset-load-btn">
            🚗 Load car(s) from file
            <input type="file" id="loadCarInput" accept=".car,.json" multiple />
          </label>
          <div id="carPickerList" class="asset-list"></div>
        </div>
      </div>
    </div>

    <div class="controls-group" data-group="selected" style="display: none">
      <span class="controls-group-label">Selected</span>
      <div class="selected-info">
        <div class="selected-row">
          <span class="selected-tag" title="Selected world">🌍</span>
          <span id="selectedWorldName" class="selected-name">—</span>
        </div>
        <div class="selected-row">
          <span class="selected-tag" title="Selected car(s)">🚗</span>
          <span id="selectedCarNames" class="selected-name">—</span>
        </div>
      </div>
    </div>

    <div class="controls-separator" data-group="borders-sep"></div>

    <div class="controls-group" data-group="borders">
      <span class="controls-group-label">Borders</span>
      <div class="border-mode-group">
        <button
          id="borderModeNone"
          class="border-mode-btn"
          title="No borders"
        >
          🚫
        </button>
        <button
          id="borderModeDamage"
          class="border-mode-btn active"
          title="Damage on collision"
        >
          💀
        </button>
        <button
          id="borderModeCollision"
          class="border-mode-btn"
          title="Collision with borders"
        >
          🛡️
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="tracking-sep"></div>

    <div class="controls-group" data-group="tracking">
      <span class="controls-group-label">Tracking</span>
      <div class="border-mode-group">
        <button
          id="trackModeNone"
          class="border-mode-btn"
          title="No tracking (free drag)"
        >
          ✋
        </button>
        <button
          id="trackModeBest"
          class="border-mode-btn active"
          title="Track best car"
        >
          🏆
        </button>
        <button
          id="trackModeKeys"
          class="border-mode-btn"
          title="Track user-controlled car"
        >
          🎮
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="viewport-sep"></div>

    <div class="controls-group" data-group="viewport">
      <span class="controls-group-label">Viewport</span>
      <div class="border-mode-group">
        <button
          id="viewportModeMouse"
          class="border-mode-btn active"
          title="Mouse mode — scroll wheel zooms"
        >
          🖱️
        </button>
        <button
          id="viewportModeTouchpad"
          class="border-mode-btn"
          title="Touchpad mode — two-finger scroll pans, hold Ctrl to zoom"
        >
          🖐️
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="debug-sep"></div>

    <div class="controls-group" data-group="debug">
      <span class="controls-group-label">Debug</span>
      <label class="view-toggle-label" title="Show camera debug overlay">
        <input type="checkbox" id="showCameraDebug" />
        <span>Cam</span>
      </label>
    </div>
`;
