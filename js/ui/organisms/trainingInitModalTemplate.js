export const TRAINING_INIT_MODAL_TEMPLATE = `
<div class="ti-overlay">
  <div class="ti-dialog" role="dialog" aria-modal="true" aria-labelledby="tiTitle">
    <div class="ti-header">
      <h3 class="ti-title" id="tiTitle">Start Training</h3>
      <p class="ti-subtitle" id="tiSubtitle">
        Choose where the brains come from and review the car settings.
      </p>
    </div>

    <!-- ── Brain source ─────────────────────────────── -->
    <div class="ti-section">
      <div class="ti-section-title">🧠 Brain source</div>
      <div class="ti-source-list">
        <label class="ti-source" data-source="fresh">
          <input type="radio" name="tiBrainSource" value="fresh" />
          <span class="ti-source-text">
            <span class="ti-source-name">🆕 Fresh</span>
            <span class="ti-source-desc">Start from random brains.</span>
          </span>
        </label>
        <label class="ti-source" data-source="pool">
          <input type="radio" name="tiBrainSource" value="pool" />
          <span class="ti-source-text">
            <span class="ti-source-name">💾 Saved pool <span id="tiPoolCountLabel"></span></span>
            <span class="ti-source-desc" id="tiPoolDesc">Continue from the stored best pool.</span>
          </span>
        </label>
        <label class="ti-source" data-source="selected">
          <input type="radio" name="tiBrainSource" value="selected" />
          <span class="ti-source-text">
            <span class="ti-source-name">🚗 Selected car(s) <span id="tiSelectedCountLabel"></span></span>
            <span class="ti-source-desc" id="tiSelectedDesc">Seed from the car(s) selected in the toolbar.</span>
          </span>
        </label>
      </div>
    </div>

    <!-- ── Training params ──────────────────────────── -->
    <div class="ti-section">
      <div class="ti-section-title">⚙️ Training params</div>
      <div class="ti-param-grid">
        <div class="ctrl">
          <span class="ctrl-label">Cars</span>
          <input type="number" id="tiCarCount" min="0" max="5000" step="100" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Mutation</span>
          <input type="number" id="tiMutation" min="0.001" max="1" step="0.05" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Pool</span>
          <input type="number" id="tiPoolCount" min="1" max="20" step="1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Idle Range</span>
          <input type="number" id="tiIdleRange" min="200" max="20000" step="200" />
        </div>
      </div>
    </div>

    <!-- ── Car config ───────────────────────────────── -->
    <div class="ti-section">
      <div class="ti-section-title">
        🚙 Car config
        <span class="ti-config-note" id="tiConfigNote"></span>
      </div>
      <div class="ti-param-grid" id="tiCarConfigGrid">
        <div class="ctrl">
          <span class="ctrl-label">Height</span>
          <input type="number" id="tiCarHeight" min="20" max="150" step="5" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Width</span>
          <input type="number" id="tiCarWidth" min="10" max="100" step="5" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Hidden Layers</span>
          <input type="text" id="tiCarHiddenLayers" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Max Speed</span>
          <input type="number" id="tiCarMaxSpeed" min="1" max="20" step="0.01" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Accel</span>
          <input type="number" id="tiCarAcceleration" min="0.001" max="1" step="0.001" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Friction</span>
          <input type="number" id="tiCarFriction" min="0.001" max="0.5" step="0.001" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Rays</span>
          <input type="number" id="tiCarRayCount" min="1" max="20" step="1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Ray Len</span>
          <input type="number" id="tiCarRayLength" min="50" max="500" step="10" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Ray Spread</span>
          <input type="number" id="tiCarRaySpread" min="0.1" max="6.28" step="0.1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Ray Offset</span>
          <input type="number" id="tiCarRayOffset" min="-3.14" max="3.14" step="0.1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">State Aware</span>
          <input type="checkbox" id="tiCarStateAware" />
        </div>
      </div>
    </div>

    <div class="ti-actions">
      <button id="tiCancelBtn" class="btn-lg btn-danger-outline" type="button">Cancel</button>
      <button id="tiStartBtn" class="btn-lg btn-primary" type="button">▶️ Start Training</button>
    </div>
  </div>
</div>
`;
