export const WORLD_SETUP_TEMPLATE = `
    <div class="controls-group world-editor-action" data-group="storage" style="display: none">
      <span class="controls-group-label">Storage</span>
      <div class="border-mode-group">
        <button
          id="saveBtn"
          class="toolbar-btn"
          data-tooltip="Save — Save world to file and localStorage"
        >
          <app-icon name="save"></app-icon>
        </button>
        <button
          id="disposeBtn"
          class="toolbar-btn"
          data-tooltip="Clear — Reset all graph points and segments"
        >
          <app-icon name="trash"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-separator world-editor-action" data-group="storage-sep" style="display: none"></div>

    <div class="controls-group" data-group="world">
      <span class="controls-group-label">World</span>
      <div class="border-mode-group">
        <div class="asset-picker" data-picker="world">
          <button
            type="button"
            id="loadWorldBtn"
            class="toolbar-btn"
            data-tooltip="Load / select world"
          >
            <app-icon name="globe"></app-icon>
          </button>
          <div id="worldPicker" class="asset-popover" hidden>
            <label for="loadWorldInput" class="file-input-label asset-load-btn">
              <app-icon name="folder"></app-icon> Load from file
              <input type="file" id="loadWorldInput" accept=".world" />
            </label>
            <div id="worldPickerList" class="asset-list"></div>
          </div>
        </div>
        <button
          id="openOsmPanelBtn"
          class="toolbar-btn world-editor-action"
          data-tooltip="Import from OSM — Paste OpenStreetMap data to generate roads"
          style="display: none"
        >
          <app-icon name="osm-import"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-group" data-group="car">
      <span class="controls-group-label">Car</span>
      <div class="asset-picker" data-picker="car">
        <button
          type="button"
          id="loadCarBtn"
          class="toolbar-btn"
          data-tooltip="Load / select car(s)"
        >
          <app-icon name="car"></app-icon>
        </button>
        <div id="carPicker" class="asset-popover" hidden>
          <label for="loadCarInput" class="file-input-label asset-load-btn">
            <app-icon name="folder"></app-icon> Load car(s) from file
            <input type="file" id="loadCarInput" accept=".car,.json" multiple />
          </label>
          <div id="carPickerList" class="asset-list"></div>
        </div>
      </div>
    </div>

    <div class="controls-separator" data-group="selected-sep"></div>

    <div class="controls-group" data-group="selected" style="display: none">
      <span class="controls-group-label">Selected</span>
      <div class="selected-info">
        <div class="selected-row" data-selected-row="world">
          <span class="selected-tag" title="Selected world"><app-icon name="globe"></app-icon></span>
          <span id="selectedWorldName" class="selected-name">—</span>
        </div>
        <div class="selected-row" data-selected-row="car">
          <span class="selected-tag" title="Selected car(s)"><app-icon name="car"></app-icon></span>
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
          class="toolbar-btn"
          data-tooltip="No borders"
        >
          <app-icon name="no-entry"></app-icon>
        </button>
        <button
          id="borderModeDamage"
          class="toolbar-btn active"
          data-tooltip="Damage on collision"
        >
          <app-icon name="skull"></app-icon>
        </button>
        <button
          id="borderModeCollision"
          class="toolbar-btn"
          data-tooltip="Collision with borders"
        >
          <app-icon name="shield"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="tracking-sep"></div>

    <div class="controls-group" data-group="tracking">
      <span class="controls-group-label">Tracking</span>
      <div class="border-mode-group">
        <button
          id="trackModeNone"
          class="toolbar-btn"
          data-tooltip="No tracking (free drag)"
        >
          <app-icon name="hand"></app-icon>
        </button>
        <button
          id="trackModeBest"
          class="toolbar-btn active"
          data-tooltip="Track best car"
        >
          <app-icon name="trophy"></app-icon>
        </button>
        <button
          id="trackModeKeys"
          class="toolbar-btn"
          data-tooltip="Track user-controlled car"
        >
          <app-icon name="gamepad"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="viewport-sep"></div>

    <div class="controls-group" data-group="viewport">
      <span class="controls-group-label">Viewport</span>
      <div class="border-mode-group">
        <button
          id="viewportModeMouse"
          class="toolbar-btn active"
          data-tooltip="Mouse mode — scroll wheel zooms"
        >
          <app-icon name="mouse"></app-icon>
        </button>
        <button
          id="viewportModeTouchpad"
          class="toolbar-btn"
          data-tooltip="Touchpad mode — two-finger scroll pans, hold Ctrl to zoom"
        >
          <app-icon name="pointer"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="debug-sep"></div>

    <div class="controls-group" data-group="debug">
      <span class="controls-group-label">Debug</span>
      <label class="view-toggle-label" data-tooltip="Show camera debug overlay">
        <input type="checkbox" id="showCameraDebug" />
        <span>Cam</span>
      </label>
    </div>
`;
