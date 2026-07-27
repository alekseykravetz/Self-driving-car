export const ANIMATION_LOOP_TOOLBAR_TEMPLATE = `
    <div class="controls-group">
      <span class="controls-group-label">Loop</span>
      <div class="border-mode-group">
        <button
          type="button"
          id="loopPauseBtn"
          class="toolbar-btn active"
          data-tooltip="Pause / resume the simulation"
        >
          <app-icon name="pause"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-separator"></div>

    <div class="controls-group">
      <span class="controls-group-label">Render frames</span>
      <div
        class="num-input-row num-input-row-sm"
        data-tooltip="Draw 1 of every N frames (physics always runs at full rate). Higher = fewer redraws = faster sim with choppier visuals."
      >
        <button type="button" class="num-btn" id="renderIntervalDec">
          <app-icon name="minus"></app-icon>
        </button>
        <input
          type="number"
          id="renderInterval"
          min="1"
          max="10"
          step="1"
          value="1"
        />
        <button type="button" class="num-btn" id="renderIntervalInc">
          <app-icon name="plus"></app-icon>
        </button>
      </div>
    </div>

    <div class="controls-separator"></div>

    <div class="controls-group">
      <span class="controls-group-label">Play Time</span>
      <div class="time-display-group">
        <span
          id="elapsedTimeDisplay"
          class="elapsed-time"
          data-tooltip="Elapsed simulation time (HH:MM:SS)"
        >
          00:00:00
        </span>
        <button
          type="button"
          id="resetTimeBtn"
          class="reset-time-btn"
          data-tooltip="Reset elapsed time"
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
        data-tooltip="Actual rendering frames per second"
      >
        0 fps
      </span>
    </div>
`;
