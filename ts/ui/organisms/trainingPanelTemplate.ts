import { numInputRowHtml } from '../molecules/numInputRow.js';

export const TRAINING_PANEL_TEMPLATE = `
<!-- ── Storage ─────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span class="status-dot" id="dot-storage"></span>
    <span>Storage</span>
  </div>
  <div class="btn-row">
    <button
      id="saveBtn"
      class="btn-sm btn-success-outline"
      title="Save pool to localStorage and download .car files"
    >
      <app-icon name="save"></app-icon> Save
    </button>
    <button
      id="discardBtn"
      class="btn-sm btn-danger-outline"
      title="Delete saved brain from localStorage"
    >
      <app-icon name="trash"></app-icon> Clear
    </button>
  </div>
</div>

<!-- ── Stats ───────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Statistics</div>
  <div id="statsPanel">
    <div class="stat-row">
      <span class="stat-emoji"><app-icon name="dna"></app-icon></span>
      <span class="stat-label">Gen</span>
      <span class="stat-value" id="stat-gen">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji"><app-icon name="road"></app-icon></span>
      <span class="stat-label">Dist</span>
      <span class="stat-value" id="stat-dist">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji"><app-icon name="dash"></app-icon></span>
      <span class="stat-label">Speed</span>
      <span class="stat-value" id="stat-speed">0 km/h</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji"><app-icon name="alive"></app-icon></span>
      <span class="stat-label">Alive</span>
      <span class="stat-value" id="stat-alive">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji"><app-icon name="skull"></app-icon></span>
      <span class="stat-label">Dead</span>
      <span class="stat-value" id="stat-dead">0</span>
    </div>
    <div class="stat-row stat-row-toggle" id="stat-frozen-row" title="Click to toggle idle (freeze far cars)">
      <span class="stat-emoji"><app-icon name="frozen"></app-icon></span>
      <span class="stat-label">Idle</span>
      <span class="stat-value" id="stat-frozen">0</span>
    </div>
    <div class="idle-range-wrap" id="idleRangeWrap" title="Cars farther than this distance from the best car are frozen (idle) to save performance">
      <div class="num-input-row num-input-row-sm">
        <button class="num-btn num-btn-dec" data-target="idleRange"><app-icon name="minus"></app-icon></button>
        <input
          type="number"
          id="idleRange"
          value="1000"
          min="200"
          max="20000"
          step="200"
          title="Cars farther than this distance from the best car are frozen (idle) to save performance"
        />
        <button class="num-btn num-btn-inc" data-target="idleRange"><app-icon name="plus"></app-icon></button>
      </div>
    </div>
  </div>
</div>

<!-- ── Car Config (collapsible) ────────────────────── -->
<div class="panel-section car-config-section collapsed" id="carConfigSection">
  <div class="section-title section-title-toggle car-config-toggle" id="carConfigToggle" title="Click to expand / collapse car configuration">
    <span class="status-dot" id="dot-car-config"></span>
    <span>Car Config</span>
    <span class="cfg-collapse-btn">▾</span>
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
        title="Hidden layer sizes (comma-separated, e.g. 6 or 8,6)"
      />
    </div>
    ${numInputRowHtml({ id: 'carMaxSpeed', label: 'Max Speed', icon: 'rocket', value: 3.24, min: 1, max: 20, step: 0.01, title: 'Car maximum speed' })}
    ${numInputRowHtml({ id: 'carAcceleration', label: 'Accel', icon: 'bolt', value: 0.01, min: 0.001, max: 1, step: 0.001, title: 'Car acceleration' })}
    ${numInputRowHtml({ id: 'carFriction', label: 'Friction', icon: 'tire', value: 0.002, min: 0.001, max: 0.5, step: 0.001, title: 'Car friction' })}
    ${numInputRowHtml({ id: 'carRayCount', label: 'Rays', icon: 'antenna', value: 5, min: 1, max: 20, step: 1, title: 'Sensor ray count' })}
    ${numInputRowHtml({ id: 'carRayLength', label: 'Ray Len', icon: 'ruler', value: 150, min: 50, max: 500, step: 10, title: 'Sensor ray length' })}
    ${numInputRowHtml({ id: 'carRaySpread', label: 'Ray Spread', icon: 'flashlight', value: 1.57, min: 0.1, max: 6.28, step: 0.1, title: 'Sensor ray spread (radians)' })}
    ${numInputRowHtml({ id: 'carRayOffset', label: 'Ray Offset', icon: 'compass', value: 0, min: -3.14, max: 3.14, step: 0.1, title: 'Sensor ray offset (radians)' })}
    <div class="ctrl ctrl-wide ti-checkbox-ctrl">
      <label class="ti-checkbox-label">
        <input type="checkbox" id="carStateAware" />
        <span class="ctrl-label"><app-icon name="traffic-light"></app-icon> State Aware</span>
      </label>
      <span class="ti-field-desc">
        Doubles the network inputs — each ray reports the nearby traffic-control
        state as a second value (2 inputs per ray instead of 1).
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

<!-- ── Parameters ──────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Training Params</div>
  <div class="param-grid">
    <div class="ctrl">
      <span class="ctrl-label">Cars</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="carCount"><app-icon name="minus"></app-icon></button>
        <input
          type="number"
          id="carCount"
          value="500"
          min="0"
          max="5000"
          step="500"
          title="Number of AI cars in the population"
        />
        <button class="num-btn num-btn-inc" data-target="carCount"><app-icon name="plus"></app-icon></button>
      </div>
    </div>
    <div class="ctrl">
      <span class="ctrl-label">Mutation</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="threshold"><app-icon name="minus"></app-icon></button>
        <input
          type="number"
          id="threshold"
          value="0.2"
          step="0.05"
          min="0.001"
          max="1"
          title="Mutation amount applied each generation"
        />
        <button class="num-btn num-btn-inc" data-target="threshold"><app-icon name="plus"></app-icon></button>
      </div>
    </div>
    <div class="ctrl">
      <span class="ctrl-label">Pool</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="poolCount"><app-icon name="minus"></app-icon></button>
        <input
          type="number"
          id="poolCount"
          value="1"
          min="1"
          max="20"
          step="1"
          title="Number of top cars kept in the best pool"
        />
        <button class="num-btn num-btn-inc" data-target="poolCount"><app-icon name="plus"></app-icon></button>
      </div>
    </div>
  </div>
</div>

<!-- ── Simulation Controls ─────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Simulation</div>
  <div class="btn-group-large">
    <button
      id="nextGenBtn"
      class="btn-lg btn-primary"
      title="Start next generation (keeps best brains)"
    >
      <app-icon name="dna"></app-icon> Next Gen
    </button>
    <button
      id="newTrainingBtn"
      class="btn-lg btn-danger"
      title="Start fresh training (no brains carried over)"
    >
      <app-icon name="restart"></app-icon> New Training
    </button>
  </div>
</div>

<!-- ── Pool Statistics ──────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span class="status-dot" id="dot-pool"></span>
    <span>Pool</span>
  </div>
  <div id="poolStatsPanel">
    <table class="pool-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Speed</th>
          <th>Fitness</th>
        </tr>
      </thead>
      <tbody id="poolTableBody">
      </tbody>
    </table>
  </div>
</div>
`;
