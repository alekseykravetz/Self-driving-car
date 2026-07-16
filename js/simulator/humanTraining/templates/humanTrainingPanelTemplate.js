export const HUMAN_TRAINING_PANEL_TEMPLATE = `
<div id="trainingManagerPanel">
  <!-- Header -->
  <div class="panel-section">
    <div class="section-title">Human Backpropagation</div>
    <div id="htMode">World</div>
  </div>

  <!-- How it works (collapsible) -->
  <div class="panel-section">
    <details class="ht-howto">
      <summary>How it works</summary>
      <div class="ht-howto-content">
        <p><strong>1. Drive</strong> \u2014 use arrow keys or WASD. The car\u2019s neural network watches your keypresses and the sensor readings.</p>
        <p><strong>2. Learn</strong> \u2014 each frame you press a key, the brain adjusts its weights to imitate you (backpropagation). Green rings = brain matches your key, red = mismatch.</p>
        <p><strong>3. Toggle learning</strong> \u2014 press <kbd>L</kbd> to pause/resume learning. Drive freely without training the brain.</p>
        <p><strong>4. Autopilot</strong> \u2014 check the box to let the brain drive. Learning pauses. See if it can handle the road on its own.</p>
        <p><strong>5. Save</strong> \u2014 the brain auto-saves to localStorage every second and on crash/close. Reload to resume training.</p>
      </div>
    </details>
  </div>

  <!-- Autopilot banner (hidden by default) -->
  <div id="htAutopilotBanner" class="ht-banner" style="display:none;">
    AUTOPILOT ACTIVE \u2014 brain is driving
  </div>

  <!-- Learning state -->
  <div class="panel-section">
    <div id="htLearningState" class="ht-learning-state learning">LEARNING</div>
    <div class="ht-hint">Press L to toggle</div>
  </div>

  <!-- Autopilot toggle -->
  <div class="panel-section">
    <label class="ht-checkbox-label">
      <input type="checkbox" id="htAutopilot" />
      <span>Autopilot \u2014 let brain drive</span>
    </label>
  </div>

  <!-- Car info -->
  <div class="panel-section">
    <div class="ht-info-row">
      <span class="ht-info-label">Speed</span>
      <span id="htSpeed" class="ht-info-value">0.0 km/h</span>
    </div>
  </div>

  <!-- Accuracy -->
  <div class="panel-section">
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

  <!-- Weight change indicator -->
  <div class="panel-section">
    <div class="ht-info-row">
      <span class="ht-info-label">Brain activity</span>
      <span id="htWeightIndicator" class="ht-weight-dot"></span>
    </div>
    <div class="ht-info-row">
      <span class="ht-info-label">Training frames</span>
      <span id="htTrainingFrames" class="ht-info-value">0</span>
    </div>
  </div>

  <!-- Learning rate -->
  <div class="panel-section">
    <label class="ht-slider-label">
      <span>Learning rate</span>
      <div class="ht-slider-row">
        <input type="range" id="htLearningRate" min="0.01" max="0.5" step="0.01" value="0.1" />
        <span id="htLearningRateVal">0.10</span>
      </div>
    </label>
  </div>

  <!-- Buttons -->
  <div class="panel-section">
    <div class="btn-group-large">
      <button id="htConfig" class="btn-lg">\u2699\uFE0F Config</button>
      <button id="htDownload" class="btn-lg">Download .car</button>
      <button id="htResetBrain" class="btn-lg btn-danger">Reset brain</button>
      <button id="htResetCar" class="btn-lg">Reset car</button>
    </div>
  </div>

  <!-- Status -->
  <div class="panel-section">
    <div id="htStatus" class="ht-status">Brain: fresh</div>
  </div>
</div>
`;
