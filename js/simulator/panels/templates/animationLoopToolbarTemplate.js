'use strict';
const ANIMATION_LOOP_TOOLBAR_TEMPLATE = `
    <div class="controls-group">
      <span class="controls-group-label">Loop</span>
      <div class="border-mode-group">
        <button
          type="button"
          id="loopPauseBtn"
          class="border-mode-btn active"
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
`;
