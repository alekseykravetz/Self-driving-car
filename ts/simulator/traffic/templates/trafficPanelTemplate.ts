export const TRAFFIC_PANEL_TEMPLATE = `
<!-- ── Spawn ───────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title"><span>Spawn Traffic</span></div>
  <div class="ctrl">
    <span class="ctrl-label"><app-icon name="car"></app-icon> Count</span>
    <div class="num-input-row">
      <input
        type="number"
        id="trafficSpawnCount"
        min="1"
        max="20000"
        step="100"
        value="1000"
        title="Number of cars to spawn"
      />
    </div>
  </div>
  <div class="btn-row">
    <button
      id="trafficSpawn1kBtn"
      class="btn-sm"
      title="Spawn 1,000 cars at random road positions"
    >
      1K
    </button>
    <button
      id="trafficSpawn2kBtn"
      class="btn-sm"
      title="Spawn 2,000 cars at random road positions"
    >
      2K
    </button>
  </div>
  <div class="btn-row">
    <button
      id="trafficSpawnCustomBtn"
      class="btn-sm btn-success-outline"
      title="Spawn the count above at random road positions"
    >
      <app-icon name="car"></app-icon> Spawn
    </button>
  </div>
</div>

<!-- ── View ────────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title"><span>View</span></div>
  <div class="ctrl">
    <span class="ctrl-label"><app-icon name="globe"></app-icon> World Zoom</span>
    <div class="btn-row">
      <button id="trafficZoomOutBtn" class="num-btn" title="Zoom out">
        <app-icon name="minus"></app-icon>
      </button>
      <button id="trafficZoomInBtn" class="num-btn" title="Zoom in">
        <app-icon name="plus"></app-icon>
      </button>
    </div>
  </div>
  <div class="ctrl">
    <span class="ctrl-label"><app-icon name="map"></app-icon> Mini-map Zoom</span>
    <div class="btn-row">
      <button
        id="trafficMiniMapZoomOutBtn"
        class="num-btn"
        title="Zoom mini-map out"
      >
        <app-icon name="minus"></app-icon>
      </button>
      <button
        id="trafficMiniMapZoomInBtn"
        class="num-btn"
        title="Zoom mini-map in"
      >
        <app-icon name="plus"></app-icon>
      </button>
    </div>
  </div>
</div>

<!-- ── Controls ────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title"><span>Traffic</span></div>
  <div class="btn-row">
    <button
      id="trafficUnselectBtn"
      class="btn-sm"
      title="Unselect the tracked car"
    >
      <app-icon name="pointer"></app-icon> Unselect
    </button>
  </div>
  <div class="btn-row">
    <button
      id="trafficClearBtn"
      class="btn-sm btn-danger-outline"
      title="Remove all cars from the road"
    >
      <app-icon name="trash"></app-icon> Clear
    </button>
    <button
      id="trafficDeleteDamagedBtn"
      class="btn-sm btn-warning-outline"
      title="Remove all crashed cars"
    >
      <app-icon name="crash"></app-icon> Delete Crashed
    </button>
  </div>
  <div class="traffic-count" id="trafficCount">0 cars</div>
</div>

<!-- ── Cars list ───────────────────────────────────── -->
<div class="panel-section traffic-cars-section">
  <div class="section-title"><span>Cars</span></div>
  <div id="trafficCarsList" class="traffic-cars-list"></div>
  <div id="trafficCarsEmpty" class="traffic-empty">
    Pick a car in the toolbar, then click the road to add traffic.
  </div>
</div>
`;
