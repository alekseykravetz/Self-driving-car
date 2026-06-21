'use strict';
const STORE_PANEL_TEMPLATE = `
<div class="store-panel">
  <div class="store-panel-header">
    <h3 class="store-panel-title">📦 Store Files</h3>
    <div class="store-tabs">
      <button class="store-tab active" data-tab="worlds">🗺️ Worlds <span class="store-tab-count" data-count="worlds"></span></button>
      <button class="store-tab" data-tab="cars">🚗 Cars <span class="store-tab-count" data-count="cars"></span></button>
      <button class="store-tab" data-tab="localStorage">💾 LocalStorage <span class="store-tab-count" data-count="localStorage"></span></button>
    </div>
  </div>

  <div class="store-tab-content active" data-content="worlds">
    <table class="store-table">
      <thead>
        <tr>
          <th class="sortable" data-sort-key="selected">Selected</th>
          <th class="sortable" data-sort-key="filename">Name</th>
          <th class="sortable" data-sort-key="source">Source</th>
          <th class="sortable" data-sort-key="start">Start</th>
          <th class="sortable" data-sort-key="target">Target</th>
        </tr>
      </thead>
      <tbody id="storeWorldsBody"></tbody>
    </table>
    <div class="store-empty" id="storeWorldsEmpty" style="display:none">
      No worlds available
    </div>
  </div>

  <div class="store-tab-content" data-content="cars">
    <table class="store-table">
      <thead>
        <tr>
          <th class="sortable" data-sort-key="selected">Selected</th>
          <th class="sortable" data-sort-key="filename">Name</th>
          <th class="sortable" data-sort-key="source">Source</th>
          <th class="sortable" data-sort-key="hiddenLayers">Hidden Layers</th>
          <th class="sortable" data-sort-key="maxSpeed">Speed</th>
          <th class="sortable" data-sort-key="acceleration">Accel</th>
          <th class="sortable" data-sort-key="friction">Friction</th>
          <th class="sortable" data-sort-key="rayCount">Rays</th>
          <th class="sortable" data-sort-key="rayLength">Ray Len</th>
          <th class="sortable" data-sort-key="raySpread">Spread</th>
        </tr>
      </thead>
      <tbody id="storeCarsBody"></tbody>
    </table>
    <div class="store-empty" id="storeCarsEmpty" style="display:none">
      No cars available
    </div>
  </div>

  <div class="store-tab-content" data-content="localStorage">
    <table class="store-table">
      <thead>
        <tr>
          <th class="sortable" data-sort-key="key">Key</th>
          <th class="sortable" data-sort-key="size">Size</th>
          <th class="sortable" data-sort-key="count">Count</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="storeLocalStorageBody"></tbody>
    </table>
    <div class="store-empty" id="storeLocalStorageEmpty" style="display:none">
      No tracked localStorage entries found
    </div>
  </div>
</div>
`;
