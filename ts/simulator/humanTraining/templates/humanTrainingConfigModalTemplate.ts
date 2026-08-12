import { numInputRowHtml } from '../../../ui/molecules/numInputRow.js';

export const HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE = `
<div class="ti-overlay">
  <div class="ti-dialog" role="dialog" aria-modal="true" aria-labelledby="htcTitle">
    <div class="ti-header">
      <h3 class="ti-title" id="htcTitle">Car Configuration</h3>
      <p class="ti-subtitle" id="htcSubtitle">Configure the car you want to train.</p>
    </div>

    <div class="ti-section">
      <div class="ti-section-title">
        <app-icon class="ti-section-icon" name="car"></app-icon> Car config
        <span class="ti-config-note" id="htcConfigNote"></span>
      </div>
      <div class="ti-param-grid" id="htcCarConfigGrid">
        ${numInputRowHtml({ id: 'htcCarHeight', label: 'Height', icon: 'height', min: 20, max: 150, step: 5, title: 'Car height' })}
        ${numInputRowHtml({ id: 'htcCarWidth', label: 'Width', icon: 'width', min: 10, max: 100, step: 5, title: 'Car width' })}
        ${numInputRowHtml({ id: 'htcCarMaxSpeed', label: 'Max Speed', icon: 'rocket', min: 1, max: 20, step: 0.01, title: 'Car maximum speed' })}
        <div class="ctrl">
          <span class="ctrl-label"><app-icon name="graph"></app-icon> Hidden Layers</span>
          <div class="num-input-row">
            <span class="num-btn ti-btn-spacer" aria-hidden="true"></span>
            <input type="text" id="htcCarHiddenLayers" class="ti-text-input" title="Hidden layer sizes (comma-separated, e.g. 6 or 8,6)" />
            <span class="num-btn ti-btn-spacer" aria-hidden="true"></span>
          </div>
        </div>
        ${numInputRowHtml({ id: 'htcCarAcceleration', label: 'Accel', icon: 'bolt', min: 0.001, max: 1, step: 0.001, title: 'Car acceleration' })}
        ${numInputRowHtml({ id: 'htcCarFriction', label: 'Friction', icon: 'tire', min: 0.001, max: 0.5, step: 0.001, title: 'Car friction' })}
        ${numInputRowHtml({ id: 'htcCarRayCount', label: 'Rays', icon: 'antenna', min: 1, max: 20, step: 1, title: 'Sensor ray count' })}
        ${numInputRowHtml({ id: 'htcCarRayLength', label: 'Ray Len', icon: 'ruler', min: 50, max: 500, step: 10, title: 'Sensor ray length' })}
        ${numInputRowHtml({ id: 'htcCarRaySpread', label: 'Ray Spread', icon: 'flashlight', min: 0.1, max: 6.28, step: 0.1, title: 'Sensor ray spread (radians)' })}
        ${numInputRowHtml({ id: 'htcCarRayOffset', label: 'Ray Offset', icon: 'compass', min: -3.14, max: 3.14, step: 0.1, title: 'Sensor ray offset (radians)' })}
        <div class="ti-toggle-row ctrl-wide">
          <div class="ctrl ti-checkbox-ctrl">
            <label class="ti-checkbox-label">
              <input type="checkbox" id="htcCarStateAware" />
              <span class="ctrl-label"><app-icon name="traffic-light"></app-icon> State Aware</span>
            </label>
            <span class="ti-field-desc">
              Doubles the network inputs — each ray reports the nearby traffic-control
              state as a second value (2 inputs per ray instead of 1).
            </span>
          </div>
          <div class="ctrl ti-checkbox-ctrl">
            <label class="ti-checkbox-label">
              <input type="checkbox" id="htcCarRealisticPhysics" />
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

    <div class="ti-actions">
      <button id="htcCancelBtn" class="btn-lg btn-danger-outline" type="button">
        <app-icon name="close"></app-icon> Cancel
      </button>
      <button id="htcStartBtn" class="btn-lg btn-primary" type="button">
        <app-icon name="play"></app-icon> Start
      </button>
    </div>
  </div>
</div>
`;
