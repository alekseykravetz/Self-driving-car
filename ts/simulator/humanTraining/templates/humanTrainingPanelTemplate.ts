import { numInputRowHtml } from '../../../ui/molecules/numInputRow.js';

export const HUMAN_TRAINING_PANEL_TEMPLATE = `
<div id="trainingManagerPanel">
  <!-- ── Header ─────────────────────────────────────── -->
  <div class="panel-section">
    <div class="section-title">
      <app-icon name="brain"></app-icon>
      <span>Human Backprop</span>
    </div>
    <div id="htMode" class="ht-mode-badge">World</div>
  </div>

  <!-- ── How it works (collapsible) ─────────────────── -->
  <div class="panel-section">
    <details class="ht-howto">
      <summary>How it works</summary>
      <div class="ht-howto-content">
        <p><strong>1. Drive</strong> \u2014 use arrow keys or WASD. The car\u2019s neural network watches your keypresses and the sensor readings.</p>
        <p><strong>2. Learn</strong> \u2014 each frame you press a key, the brain adjusts its weights to imitate you (backpropagation). Green = brain matches your key, red = mismatch. When learning is ON, the brain adapts within 1-2 frames, so expect mostly green once it has learned a pattern. Turn learning OFF to see the brain\u2019s actual predictions vs your input \u2014 red appears when you do something the brain hasn\u2019t learned.</p>
        <p><strong>3. Toggle learning</strong> \u2014 press <kbd>L</kbd> to pause/resume learning. Drive freely without training the brain.</p>
        <p><strong>4. Autopilot</strong> \u2014 press <kbd>P</kbd> to let the brain drive. Press a drive key any time to correct it \u2014 your correction steers the car AND trains the brain (DAgger).</p>
        <p><strong>5. Storage</strong> \u2014 the brain auto-saves to localStorage every second (and on crash/close). The Storage dot shows <strong>green</strong> when saved, <strong>orange</strong> when there are unsaved changes. Use <em>Save</em> to persist now, <em>Download .car</em> to export a file, or <em>Clear</em> to delete the saved brain.</p>
      </div>
    </details>
  </div>

  <!-- ── Autopilot banner (hidden by default) ───────── -->
  <div id="htAutopilotBanner" class="ht-banner" style="display:none;">
    AUTOPILOT ACTIVE \u2014 brain is driving (press a drive key to correct)
  </div>

  <!-- ── Learning state ─────────────────────────────── -->
  <div class="panel-section">
    <div id="htLearningState" class="ht-learning-state learning">LEARNING</div>
    <div class="ht-hint">Press L to toggle \u00b7 P for autopilot</div>
  </div>

  <!-- ── Storage ────────────────────────────────────── -->
  <div class="panel-section">
    <div class="section-title">
      <span class="status-dot" id="htStorageDot"></span>
      <span>Storage</span>
    </div>
    <div class="btn-row">
      <button
        id="htSave"
        class="btn-sm btn-success-outline"
        title="Save the brain to localStorage now"
      >
        <app-icon name="save"></app-icon> Save
      </button>
      <button
        id="htClear"
        class="btn-sm btn-danger-outline"
        title="Delete the saved brain from localStorage (keeps the live brain)"
      >
        <app-icon name="trash"></app-icon> Clear
      </button>
    </div>
    <div class="btn-row">
      <button
        id="htDownload"
        class="btn-sm"
        title="Download the trained brain as a .car file"
      >
        <app-icon name="export"></app-icon> Download .car
      </button>
    </div>
    <div id="htStatus" class="ht-status">Brain: fresh</div>
  </div>

  <!-- ── Live stats ─────────────────────────────────── -->
  <div class="panel-section">
    <div class="section-title">Live</div>
    <div id="statsPanel">
      <div class="ht-info-row">
        <span class="ht-info-label">Speed</span>
        <span id="htSpeed" class="ht-info-value">0.0 km/h</span>
      </div>
      <div class="ht-info-row">
        <span class="ht-info-label">Brain activity</span>
        <span id="htWeightIndicator" class="ht-weight-dot"></span>
      </div>
      <div class="ht-info-row">
        <span class="ht-info-label">Training frames</span>
        <span id="htTrainingFrames" class="ht-info-value">0</span>
      </div>
    </div>
  </div>

  <!-- ── Network accuracy ───────────────────────────── -->
  <div class="panel-section">
    <div class="section-title">Network Accuracy</div>
    <div id="htAccuracy">
      <div id="htAccuracyPct">Network accuracy: \u2014</div>
      <div class="ht-key-grid">
        <div class="ht-key-cell">
          <span class="ht-key" data-key="forward">\u2191</span>
          <span id="htKeyForwardPct" class="ht-key-pct">\u2014</span>
        </div>
        <div class="ht-key-cell">
          <span class="ht-key" data-key="left">\u2190</span>
          <span id="htKeyLeftPct" class="ht-key-pct">\u2014</span>
        </div>
        <div class="ht-key-cell">
          <span class="ht-key" data-key="right">\u2192</span>
          <span id="htKeyRightPct" class="ht-key-pct">\u2014</span>
        </div>
        <div class="ht-key-cell">
          <span class="ht-key" data-key="reverse">\u2193</span>
          <span id="htKeyReversePct" class="ht-key-pct">\u2014</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Learning rate ──────────────────────────────── -->
  <div class="panel-section">
    <label class="ht-slider-label">
      <span>Learning rate</span>
      <div class="ht-slider-row">
        <input type="range" id="htLearningRate" min="0.01" max="0.5" step="0.01" value="0.1" />
        <span id="htLearningRateVal">0.10</span>
      </div>
    </label>
  </div>

  <!-- ── Car Config (collapsible) ───────────────────── -->
  <div class="panel-section car-config-section collapsed" id="carConfigSection">
    <div class="section-title section-title-toggle car-config-toggle" id="carConfigToggle" title="Click to expand / collapse car configuration">
      <span class="status-dot" id="dot-car-config"></span>
      <span>Car Config</span>
      <span class="cfg-collapse-btn">\u25be</span>
    </div>
    <div class="car-config-summary" id="carConfigSummary"></div>
    <div class="car-config-grid">
      ${numInputRowHtml({ id: 'carHeight', label: 'Height', icon: 'height', value: 63, min: 20, max: 150, step: 5, title: 'Car height' })}
      ${numInputRowHtml({ id: 'carWidth', label: 'Width', icon: 'width', value: 25, min: 10, max: 100, step: 5, title: 'Car width' })}
      <div class="ctrl ctrl-wide">
        <span class="ctrl-label"><app-icon name="graph"></app-icon> Hidden Layers</span>
        <input
          type="text"
          id="carHiddenLayers"
          value="6"
          title="Hidden layer sizes (comma-separated, e.g. 6 or 8,6). Changing this starts a fresh brain."
        />
      </div>
      ${numInputRowHtml({ id: 'carMaxSpeed', label: 'Max Speed', icon: 'rocket', value: 3.24, min: 1, max: 20, step: 0.01, title: 'Car maximum speed' })}
      ${numInputRowHtml({ id: 'carAcceleration', label: 'Accel', icon: 'bolt', value: 0.01, min: 0.001, max: 1, step: 0.001, title: 'Car acceleration' })}
      ${numInputRowHtml({ id: 'carFriction', label: 'Friction', icon: 'tire', value: 0.002, min: 0.001, max: 0.5, step: 0.001, title: 'Car friction' })}
      ${numInputRowHtml({ id: 'carRayCount', label: 'Rays', icon: 'antenna', value: 5, min: 1, max: 20, step: 1, title: 'Sensor ray count. Changing this starts a fresh brain.' })}
      ${numInputRowHtml({ id: 'carRayLength', label: 'Ray Len', icon: 'ruler', value: 150, min: 50, max: 500, step: 10, title: 'Sensor ray length' })}
      ${numInputRowHtml({ id: 'carRaySpread', label: 'Ray Spread', icon: 'flashlight', value: 1.57, min: 0.1, max: 6.28, step: 0.1, title: 'Sensor ray spread (radians)' })}
      ${numInputRowHtml({ id: 'carRayOffset', label: 'Ray Offset', icon: 'compass', value: 0, min: -3.14, max: 3.14, step: 0.1, title: 'Sensor ray offset (radians)' })}
      <div class="ctrl ctrl-wide ti-checkbox-ctrl">
        <label class="ti-checkbox-label">
          <input type="checkbox" id="carStateAware" />
          <span class="ctrl-label"><app-icon name="traffic-light"></app-icon> State Aware</span>
        </label>
        <span class="ti-field-desc">
          Doubles the network inputs \u2014 each ray reports the nearby
          traffic-control state as a second value. Changing this starts a fresh brain.
        </span>
      </div>
      <div class="ctrl ctrl-wide ti-checkbox-ctrl">
        <label class="ti-checkbox-label">
          <input type="checkbox" id="carRealisticPhysics" />
          <span class="ctrl-label"><app-icon name="bolt"></app-icon> Realistic Physics</span>
        </label>
        <span class="ti-field-desc">
          Speed-dependent steering, drag, braking, and engine power curve
          instead of the flat-friction, constant-turn-rate arcade model.
        </span>
      </div>
    </div>
  </div>

  <!-- ── Session ────────────────────────────────────── -->
  <div class="panel-section">
    <div class="section-title">Session</div>
    <div class="btn-group-large">
      <button
        id="htRestartDrive"
        class="btn-lg btn-primary"
        title="Move the car back to the start (keeps the trained brain)"
      >
        <app-icon name="restart"></app-icon> Restart drive
      </button>
      <button
        id="htNewBrain"
        class="btn-lg btn-danger"
        title="Discard the trained brain and start a fresh one"
      >
        <app-icon name="brain"></app-icon> New brain
      </button>
    </div>
  </div>

  <!-- ── Brain inspector ────────────────────────────── -->
  <div class="panel-section">
    <div class="section-title">Brain Inspector</div>
    <div id="htBrainInspector" class="ht-brain-inspector"></div>
  </div>
</div>
`;
