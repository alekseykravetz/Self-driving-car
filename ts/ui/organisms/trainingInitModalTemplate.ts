import { numInputRowHtml } from '../molecules/numInputRow.js';

export const TRAINING_INIT_MODAL_TEMPLATE = `
<div class="ti-overlay">
  <div class="ti-dialog" role="dialog" aria-modal="true" aria-labelledby="tiTitle">
    <div class="ti-header">
      <h3 class="ti-title" id="tiTitle">Start Training</h3>
      <p class="ti-subtitle" id="tiSubtitle">
        Choose where the brains come from and review the car settings.
      </p>
    </div>

    <div class="ti-body">
    <div class="ti-col">

    <!-- ── Brain source ─────────────────────────────── -->
    <div class="ti-section">
      <div class="ti-section-title"><app-icon class="ti-section-icon" name="brain"></app-icon> Brain source</div>
      <div class="ti-source-list">
        <label class="ti-source" data-source="fresh">
          <input type="radio" name="tiBrainSource" value="fresh" />
          <span class="ti-source-icon"><app-icon name="dna"></app-icon></span>
          <span class="ti-source-text">
            <span class="ti-source-name">Fresh brains</span>
            <span class="ti-source-desc">Start from random weights — no prior training.</span>
          </span>
        </label>
        <label class="ti-source" data-source="pool">
          <input type="radio" name="tiBrainSource" value="pool" />
          <span class="ti-source-icon"><app-icon name="save"></app-icon></span>
          <span class="ti-source-text">
            <span class="ti-source-name">Saved pool <span id="tiPoolCountLabel"></span></span>
            <span class="ti-source-desc" id="tiPoolDesc">Continue from the stored best pool.</span>
          </span>
        </label>
        <label class="ti-source" data-source="selected">
          <input type="radio" name="tiBrainSource" value="selected" />
          <span class="ti-source-icon"><app-icon name="car"></app-icon></span>
          <span class="ti-source-text">
            <span class="ti-source-name">Selected car(s) <span id="tiSelectedCountLabel"></span></span>
            <span class="ti-source-desc" id="tiSelectedDesc">Seed from the car(s) selected below.</span>
          </span>
        </label>
        <div class="ti-car-selector" id="tiCarSelector" hidden>
          <div class="ti-car-selector-head">
            <app-icon name="car"></app-icon> Select car(s) to seed from
          </div>
          <div class="ti-car-list asset-list" id="tiCarList"></div>
        </div>
      </div>
    </div>

    <!-- ── Training params ──────────────────────────── -->
    <div class="ti-section">
      <div class="ti-section-title"><app-icon class="ti-section-icon" name="gear"></app-icon> Training params</div>
      <div class="ti-param-grid">
        ${numInputRowHtml({ id: 'tiCarCount', label: 'Cars', icon: 'car', min: 0, max: 5000, step: 100, title: 'Number of AI cars in the population' })}
        ${numInputRowHtml({ id: 'tiMutation', label: 'Mutation', icon: 'dna', min: 0.001, max: 1, step: 0.05, title: 'Mutation rate applied to offspring' })}
        ${numInputRowHtml({ id: 'tiPoolCount', label: 'Pool', icon: 'package', min: 1, max: 20, step: 1, title: 'Number of top brains kept in the pool' })}
        ${numInputRowHtml({ id: 'tiIdleRange', label: 'Idle Range', icon: 'frozen', min: 200, max: 20000, step: 200, title: 'Cars farther than this from the best car are frozen' })}
      </div>
    </div>

    </div>
    <div class="ti-col">

    <!-- ── Car config ───────────────────────────────── -->
    <div class="ti-section">
      <div class="ti-section-title">
        <app-icon class="ti-section-icon" name="car"></app-icon> Car config
        <span class="ti-config-note" id="tiConfigNote"></span>
      </div>
      <div class="ti-param-grid" id="tiCarConfigGrid">
        ${numInputRowHtml({ id: 'tiCarHeight', label: 'Height', icon: 'height', min: 20, max: 150, step: 5, title: 'Car height' })}
        ${numInputRowHtml({ id: 'tiCarWidth', label: 'Width', icon: 'width', min: 10, max: 100, step: 5, title: 'Car width' })}
        ${numInputRowHtml({ id: 'tiCarMaxSpeed', label: 'Max Speed', icon: 'rocket', min: 1, max: 20, step: 0.01, title: 'Car maximum speed' })}
        <div class="ctrl">
          <span class="ctrl-label"><app-icon name="graph"></app-icon> Hidden Layers</span>
          <div class="num-input-row">
            <span class="num-btn ti-btn-spacer" aria-hidden="true"></span>
            <input type="text" id="tiCarHiddenLayers" class="ti-text-input" title="Hidden layer sizes (comma-separated, e.g. 6 or 8,6)" />
            <span class="num-btn ti-btn-spacer" aria-hidden="true"></span>
          </div>
        </div>
        ${numInputRowHtml({ id: 'tiCarAcceleration', label: 'Accel', icon: 'bolt', min: 0.001, max: 1, step: 0.001, title: 'Car acceleration' })}
        ${numInputRowHtml({ id: 'tiCarFriction', label: 'Friction', icon: 'tire', min: 0.001, max: 0.5, step: 0.001, title: 'Car friction' })}
        ${numInputRowHtml({ id: 'tiCarRayCount', label: 'Rays', icon: 'antenna', min: 1, max: 20, step: 1, title: 'Sensor ray count' })}
        ${numInputRowHtml({ id: 'tiCarRayLength', label: 'Ray Len', icon: 'ruler', min: 50, max: 500, step: 10, title: 'Sensor ray length' })}
        ${numInputRowHtml({ id: 'tiCarRaySpread', label: 'Ray Spread', icon: 'flashlight', min: 0.1, max: 6.28, step: 0.1, title: 'Sensor ray spread (radians)' })}
        ${numInputRowHtml({ id: 'tiCarRayOffset', label: 'Ray Offset', icon: 'compass', min: -3.14, max: 3.14, step: 0.1, title: 'Sensor ray offset (radians)' })}
        <div class="ti-toggle-row ctrl-wide">
          <div class="ctrl ti-checkbox-ctrl">
            <label class="ti-checkbox-label">
              <input type="checkbox" id="tiCarStateAware" />
              <span class="ctrl-label"><app-icon name="traffic-light"></app-icon> State Aware</span>
            </label>
            <span class="ti-field-desc">
              Doubles the network inputs — each ray reports the nearby traffic-control
              state as a second value (2 inputs per ray instead of 1).
            </span>
          </div>
          <div class="ctrl ti-checkbox-ctrl">
            <label class="ti-checkbox-label">
              <input type="checkbox" id="tiCarRealisticPhysics" />
              <span class="ctrl-label"><app-icon name="bolt"></app-icon> Realistic Physics</span>
            </label>
            <span class="ti-field-desc">
              Speed-dependent steering, drag, braking, and engine power curve
              instead of the flat-friction, constant-turn-rate arcade model.
            </span>
          </div>
        </div>
      </div>
    </div>

    </div>
    </div>

    <div class="ti-actions">
      <button id="tiCancelBtn" class="btn-lg btn-danger-outline" type="button">
        <app-icon name="close"></app-icon> Cancel
      </button>
      <button id="tiStartBtn" class="btn-lg btn-primary" type="button">
        <app-icon name="play"></app-icon> Start Training
      </button>
    </div>
  </div>
</div>
`;
