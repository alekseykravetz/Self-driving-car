'use strict';
const ANIMATION_LOOP_TOOLBAR_TEMPLATE = `
    <div class="controls-group">
      <span class="controls-group-label">Loop</span>
      <div class="border-mode-group">
        <button
          type="button"
          id="loopPauseBtn"
          class="toolbar-btn active"
          title="Pause / resume the simulation"
        >
          ⏸️
        </button>
      </div>
    </div>

    <div class="controls-separator"></div>

    <div class="controls-group">
      <span class="controls-group-label">Render fr</span>
      <label
        class="view-toggle-label"
        title="Draw 1 of every N frames (physics always runs at full rate). Higher = fewer redraws = faster sim with choppier visuals."
      >
        <span>1 /</span>
        <input
          type="number"
          id="renderInterval"
          min="1"
          max="10"
          step="1"
          value="1"
          style="width: 3em"
        />
      </label>
    </div>

    <div class="controls-separator"></div>

    <div class="controls-group">
      <span class="controls-group-label">Play Time</span>
      <div class="time-display-group">
        <span
          id="elapsedTimeDisplay"
          class="elapsed-time"
          title="Elapsed simulation time (HH:MM:SS)"
        >
          00:00:00
        </span>
        <button
          type="button"
          id="resetTimeBtn"
          class="reset-time-btn"
          title="Reset elapsed time"
        >
          ⟲
        </button>
      </div>
    </div>

    <div class="controls-separator"></div>

    <div class="controls-group">
      <span class="controls-group-label">FPS</span>
      <span
        id="fpsDisplay"
        class="fps-display"
        title="Actual rendering frames per second"
      >
        0 fps
      </span>
    </div>
`;
