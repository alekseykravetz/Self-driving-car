export const WORLD_EDITOR_PANEL_TEMPLATE = `
  <div class="wep-panel">
    <div class="panel-section wep-section" id="wepRoadTypeSection">
      <div class="section-title section-title-toggle" id="wepRoadTypeToggle">
        <span class="section-title-text">Road Type</span>
        <span class="collapse-caret">▶</span>
      </div>
      <div class="wep-section-content">
        <select id="wepRoadType" class="wep-select">
          <option value="">Default (Residential)</option>
        </select>
        <span id="wepAutoSetHint" class="wep-auto-hint">Auto-set: —</span>
        <div class="wep-field">
          <label class="wep-field-label">Labels</label>
          <select id="wepSignageLang" class="wep-select">
            <option value="native">Native</option>
            <option value="en">English</option>
            <option value="he">Hebrew</option>
            <option value="ar">Arabic</option>
            <option value="ru">Russian</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-section wep-section" id="wepPropertiesSection">
      <div class="section-title section-title-toggle" id="wepPropertiesToggle">
        <span class="section-title-text">Properties</span>
        <span class="collapse-caret">▶</span>
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
        <div class="wep-subsection collapsed" id="wepLocalizedNamesSection">
          <div class="section-title section-title-toggle wep-subsection-title" id="wepLocalizedNamesToggle">
            <span class="section-title-text">Localized names</span>
            <span class="collapse-caret">▶</span>
          </div>
          <div class="wep-subsection-content">
            <div class="wep-field">
              <label class="wep-field-label">EN</label>
              <input type="text" id="wepNameEn" class="wep-text-input" placeholder="name:en">
            </div>
            <div class="wep-field">
              <label class="wep-field-label">HE</label>
              <input type="text" id="wepNameHe" class="wep-text-input" placeholder="name:he">
            </div>
            <div class="wep-field">
              <label class="wep-field-label">AR</label>
              <input type="text" id="wepNameAr" class="wep-text-input" placeholder="name:ar">
            </div>
            <div class="wep-field">
              <label class="wep-field-label">RU</label>
              <input type="text" id="wepNameRu" class="wep-text-input" placeholder="name:ru">
            </div>
          </div>
        </div>
        <div class="wep-field">
          <label class="wep-field-label">Max Speed</label>
          <div class="num-input-row num-input-row-sm">
            <button type="button" class="num-btn" id="wepMaxSpeedDec">−</button>
            <input type="number" id="wepMaxSpeed" min="0" step="5" placeholder="km/h">
            <button type="button" class="num-btn" id="wepMaxSpeedInc">+</button>
            <button type="button" class="num-btn wep-clear-btn" id="wepMaxSpeedClear" title="Clear max speed (unset)"><app-icon name="close"></app-icon></button>
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
        <span class="section-title-text">Path Tools</span>
        <span class="collapse-caret">▶</span>
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
