const TRAFFIC_PANEL_TEMPLATE = `
<!-- ── Controls ────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title"><span>Traffic</span></div>
  <div class="btn-row">
    <button
      id="trafficClearBtn"
      class="btn-sm btn-danger-outline"
      title="Remove all cars from the road"
    >
      🗑️ Clear
    </button>
    <button
      id="trafficDeleteDamagedBtn"
      class="btn-sm btn-warning-outline"
      title="Remove all crashed cars"
    >
      💥 Delete Crashed
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
