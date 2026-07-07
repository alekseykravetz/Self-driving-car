export const TRAINING_PANEL_TEMPLATE = `
<!-- ── Storage ─────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span>Storage</span>
    <span class="status-dot" id="dot-storage"></span>
  </div>
  <div class="btn-row">
    <button
      id="saveBtn"
      class="btn-sm btn-success-outline"
      title="Save pool to localStorage and download .car files"
    >
      💾 Save
    </button>
    <button
      id="discardBtn"
      class="btn-sm btn-danger-outline"
      title="Delete saved brain from localStorage"
    >
      🗑️ Clear
    </button>
  </div>
</div>

<!-- ── Stats ───────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Statistics</div>
  <div id="statsPanel">
    <div class="stat-row">
      <span class="stat-emoji">🧬</span>
      <span class="stat-label">Gen</span>
      <span class="stat-value" id="stat-gen">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">🛣️</span>
      <span class="stat-label">Dist</span>
      <span class="stat-value" id="stat-dist">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">💨</span>
      <span class="stat-label">Speed</span>
      <span class="stat-value" id="stat-speed">0 km/h</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">🟢</span>
      <span class="stat-label">Alive</span>
      <span class="stat-value" id="stat-alive">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">💀</span>
      <span class="stat-label">Dead</span>
      <span class="stat-value" id="stat-dead">0</span>
    </div>
    <div class="stat-row stat-row-toggle" id="stat-frozen-row" title="Click to toggle idle (freeze far cars)">
      <span class="stat-emoji">❄️</span>
      <span class="stat-label">Idle</span>
      <span class="stat-value" id="stat-frozen">0</span>
    </div>
    <div class="idle-range-wrap" id="idleRangeWrap" title="Cars farther than this distance from the best car are frozen (idle) to save performance">
      <div class="num-input-row num-input-row-sm">
        <button class="num-btn num-btn-dec" data-target="idleRange">➖</button>
        <input
          type="number"
          id="idleRange"
          value="1000"
          min="200"
          max="20000"
          step="200"
          title="Cars farther than this distance from the best car are frozen (idle) to save performance"
        />
        <button class="num-btn num-btn-inc" data-target="idleRange">➕</button>
      </div>
    </div>
  </div>
</div>

<!-- ── Car Config (collapsible) ────────────────────── -->
<div class="panel-section car-config-section collapsed" id="carConfigSection">
  <div class="section-title section-title-toggle" id="carConfigToggle" title="Click to expand / collapse car configuration">
    <span class="collapse-caret">▸</span>
    <span>Car Config</span>
    <span class="status-dot" id="dot-car-config"></span>
  </div>
  <div class="car-config-summary" id="carConfigSummary"></div>
  <div class="car-config-grid">
    <div class="ctrl">
      <span class="ctrl-label">Height</span>
      <input
        type="number"
        id="carHeight"
        value="63"
        step="5"
        min="20"
        max="150"
        title="Car height"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Width</span>
      <input
        type="number"
        id="carWidth"
        value="25"
        step="5"
        min="10"
        max="100"
        title="Car width"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Hidden Layers</span>
      <input
        type="text"
        id="carHiddenLayers"
        value="6"
        title="Hidden layer sizes (comma-separated, e.g. 6 or 8,6)"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Max Speed</span>
      <input
        type="number"
        id="carMaxSpeed"
        value="3.24"
        step="0.01"
        min="1"
        max="20"
        title="Car maximum speed"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Accel</span>
      <input
        type="number"
        id="carAcceleration"
        value="0.01"
        step="0.001"
        min="0.001"
        max="1"
        title="Car acceleration"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Friction</span>
      <input
        type="number"
        id="carFriction"
        value="0.002"
        step="0.001"
        min="0.001"
        max="0.5"
        title="Car friction"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Rays</span>
      <input
        type="number"
        id="carRayCount"
        value="5"
        step="1"
        min="1"
        max="20"
        title="Sensor ray count"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Ray Len</span>
      <input
        type="number"
        id="carRayLength"
        value="150"
        step="10"
        min="50"
        max="500"
        title="Sensor ray length"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Ray Spread</span>
      <input
        type="number"
        id="carRaySpread"
        value="1.57"
        step="0.1"
        min="0.1"
        max="6.28"
        title="Sensor ray spread (radians)"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Ray Offset</span>
      <input
        type="number"
        id="carRayOffset"
        value="0"
        step="0.1"
        min="-3.14"
        max="3.14"
        title="Sensor ray offset (radians)"
      />
    </div>

    <div class="ctrl ctrl-checkbox">
      <label title="Let the sensor detect traffic lights (doubles the brain input layer)">
        <input type="checkbox" id="carTrafficAwareness" />
        <span class="ctrl-label">Traffic Lights</span>
      </label>
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
        <button class="num-btn num-btn-dec" data-target="carCount">➖</button>
        <input
          type="number"
          id="carCount"
          value="500"
          min="0"
          max="5000"
          step="500"
          title="Number of AI cars in the population"
        />
        <button class="num-btn num-btn-inc" data-target="carCount">➕</button>
      </div>
    </div>
    <div class="ctrl">
      <span class="ctrl-label">Mutation</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="threshold">➖</button>
        <input
          type="number"
          id="threshold"
          value="0.2"
          step="0.05"
          min="0.001"
          max="1"
          title="Mutation amount applied each generation"
        />
        <button class="num-btn num-btn-inc" data-target="threshold">➕</button>
      </div>
    </div>
    <div class="ctrl">
      <span class="ctrl-label">Pool</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="poolCount">➖</button>
        <input
          type="number"
          id="poolCount"
          value="1"
          min="1"
          max="20"
          step="1"
          title="Number of top cars kept in the best pool"
        />
        <button class="num-btn num-btn-inc" data-target="poolCount">➕</button>
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
      🧬 Next Gen
    </button>
    <button
      id="newTrainingBtn"
      class="btn-lg btn-danger"
      title="Start fresh training (no brains carried over)"
    >
      🔄 New Training
    </button>
  </div>
</div>

<!-- ── Pool Statistics ──────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span>Pool</span>
    <span class="status-dot" id="dot-pool"></span>
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
