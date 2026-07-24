export const WORLD_EDITOR_PANEL_TEMPLATE = `
  <div class="wep-panel">
    <div class="panel-section wep-section" id="wepRoadTypeSection">
      <div class="section-title section-title-toggle" id="wepRoadTypeToggle">
        <span class="collapse-caret">▶</span>
        Road Type
      </div>
      <div class="wep-section-content">
        <select id="wepRoadType" class="wep-select">
          <option value="">Default (Residential)</option>
        </select>
        <span id="wepAutoSetHint" class="wep-auto-hint">Auto-set: —</span>
      </div>
    </div>

    <div class="panel-section wep-section" id="wepPropertiesSection">
      <div class="section-title section-title-toggle" id="wepPropertiesToggle">
        <span class="collapse-caret">▶</span>
        Properties
      </div>
      <div class="wep-section-content">
        <div class="wep-field">
          <label class="wep-field-label">Lanes</label>
          <div class="num-input-row num-input-row-sm">
            <button type="button" class="num-btn" id="wepLanesDec">−</button>
            <input type="number" id="wepLanes" value="2" min="1" max="8" step="1">
            <button type="button" class="num-btn" id="wepLanesInc">+</button>
          </div>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" id="wepOneWay"> One-way
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="wepSeparated"> Hard separation
        </label>
        <div class="wep-field">
          <label class="wep-field-label">Name</label>
          <input type="text" id="wepName" class="wep-text-input" placeholder="Street name">
        </div>
        <div class="wep-field">
          <label class="wep-field-label">Max Speed</label>
          <div class="num-input-row num-input-row-sm">
            <button type="button" class="num-btn" id="wepMaxSpeedDec">−</button>
            <input type="number" id="wepMaxSpeed" min="0" step="5" placeholder="km/h">
            <button type="button" class="num-btn" id="wepMaxSpeedInc">+</button>
            <button type="button" class="num-btn wep-clear-btn" id="wepMaxSpeedClear" title="Clear max speed (unset)">✕</button>
          </div>
        </div>
        <div class="wep-field">
          <label class="wep-field-label">Ref</label>
          <input type="text" id="wepRef" class="wep-text-input" placeholder="Road ref (e.g. A1)">
        </div>
        <label class="checkbox-label">
          <input type="checkbox" id="wepBridge"> Bridge
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="wepLaneMarkings" checked> Lane markings
        </label>
      </div>
    </div>

    <div class="panel-section wep-section" id="wepPathToolsSection">
      <div class="section-title section-title-toggle" id="wepPathToolsToggle">
        <span class="collapse-caret">▶</span>
        Path Tools
      </div>
      <div class="wep-section-content">
        <div class="wep-key-indicators">
          <span class="key-indicator clickable" id="wepKeyO" data-tooltip="O — One-way road mode">O</span>
          <span class="key-indicator clickable" id="wepKeyH" data-tooltip="H — Hard-separation road mode">H</span>
          <span class="key-indicator clickable" id="wepKeyT" data-tooltip="T — Tunnel (open-ended) corridor mode">T</span>
        </div>
      </div>
    </div>
  </div>
`;
