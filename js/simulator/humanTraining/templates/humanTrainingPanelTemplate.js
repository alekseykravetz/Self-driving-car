export const HUMAN_TRAINING_PANEL_TEMPLATE = `
<div id="trainingManagerPanel">
  <div class="panel-section">
    <div class="section-title">Human Backpropagation</div>
    <div id="htMode">World</div>
  </div>

  <div class="panel-section">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ccc;">
      <input type="checkbox" id="htAutopilot" />
      <span>Autopilot — let brain drive (pauses learning)</span>
    </label>
  </div>

  <div class="panel-section">
    <div id="htAccuracy">
      <div id="htAccuracyPct" style="font-weight:700;font-size:13px;margin-bottom:6px;">Network accuracy: —</div>
      <div style="display:flex;gap:6px;">
        <span class="ht-key" data-key="forward">↑</span>
        <span class="ht-key" data-key="left">←</span>
        <span class="ht-key" data-key="right">→</span>
        <span class="ht-key" data-key="reverse">↓</span>
      </div>
    </div>
  </div>

  <div class="panel-section">
    <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#aaa;">
      <span>Learning rate</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <input type="range" id="htLearningRate" min="0.01" max="0.5" step="0.01" value="0.1" style="flex:1;" />
        <span id="htLearningRateVal" style="font-weight:700;font-size:12px;min-width:32px;text-align:right;">0.10</span>
      </div>
    </label>
  </div>

  <div class="panel-section">
    <div class="btn-group-large">
      <button id="htConfig" class="btn-lg">⚙️ Config</button>
      <button id="htDownload" class="btn-lg">Download .car</button>
      <button id="htResetBrain" class="btn-lg btn-danger">Reset brain</button>
      <button id="htResetCar" class="btn-lg">Reset car</button>
    </div>
  </div>

  <div class="panel-section">
    <div id="htStatus" style="font-size:11px;color:rgba(255,255,255,0.6);">Brain: fresh</div>
  </div>
</div>
`;
