import { numInputRowHtml } from '../../../ui/molecules/numInputRow.js';

export const TRAFFIC_PANEL_TEMPLATE = `
<!-- ── Spawn ───────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title"><span>Spawn Traffic</span></div>
  ${numInputRowHtml({ id: 'trafficSpawnCount', label: 'Count', icon: 'car', value: 1000, min: 1, max: 20000, step: 100, title: 'Number of cars to spawn' })}
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
  <input
    type="text"
    id="trafficCarSearch"
    class="traffic-car-search"
    placeholder="Find car by name…"
    title="Filter the list below by car name"
  />
  <div id="trafficCarsList" class="traffic-cars-list"></div>
  <div id="trafficCarsEmpty" class="traffic-empty">
    Pick a car in the toolbar, then click the road to add traffic.
  </div>
</div>
`;
