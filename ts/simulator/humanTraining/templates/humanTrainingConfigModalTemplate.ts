export const HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE = `
<div class="ti-overlay">
  <div class="ti-dialog" role="dialog" aria-modal="true" aria-labelledby="htcTitle">
    <div class="ti-header">
      <h3 class="ti-title" id="htcTitle">Car Configuration</h3>
      <p class="ti-subtitle" id="htcSubtitle">Configure the car you want to train.</p>
    </div>

    <div class="ti-section">
      <div class="ti-section-title">
        🚙 Car config
        <span class="ti-config-note" id="htcConfigNote"></span>
      </div>
      <div class="ti-param-grid" id="htcCarConfigGrid">
        <div class="ctrl">
          <span class="ctrl-label">Height</span>
          <input type="number" id="htcCarHeight" min="20" max="150" step="5" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Width</span>
          <input type="number" id="htcCarWidth" min="10" max="100" step="5" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Hidden Layers</span>
          <input type="text" id="htcCarHiddenLayers" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Max Speed</span>
          <input type="number" id="htcCarMaxSpeed" min="1" max="20" step="0.01" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Accel</span>
          <input type="number" id="htcCarAcceleration" min="0.001" max="1" step="0.001" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Friction</span>
          <input type="number" id="htcCarFriction" min="0.001" max="0.5" step="0.001" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Rays</span>
          <input type="number" id="htcCarRayCount" min="1" max="20" step="1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Ray Len</span>
          <input type="number" id="htcCarRayLength" min="50" max="500" step="10" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Ray Spread</span>
          <input type="number" id="htcCarRaySpread" min="0.1" max="6.28" step="0.1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">Ray Offset</span>
          <input type="number" id="htcCarRayOffset" min="-3.14" max="3.14" step="0.1" />
        </div>
        <div class="ctrl">
          <span class="ctrl-label">State Aware</span>
          <input type="checkbox" id="htcCarStateAware" />
        </div>
      </div>
    </div>

    <div class="ti-actions">
      <button id="htcCancelBtn" class="btn-lg btn-danger-outline" type="button">Cancel</button>
      <button id="htcStartBtn" class="btn-lg btn-primary" type="button">▶️ Start</button>
    </div>
  </div>
</div>
`;
