import { WORLD_EDITOR_PANEL_TEMPLATE } from './worldEditorPanelTemplate.js';
import {
  ROAD_TYPES,
  ROAD_TYPE_LABELS,
  applyRoadTypeDefaults,
} from '../../math/roadTypes.js';
import { LatchedToggle } from '../atoms/latchedToggle.js';
export interface BrushState {
  highwayType: string | undefined;
  lanes: number;
  oneWay: boolean;
  separated: boolean;
  name: string;
  maxSpeed: number | undefined;
  ref: string;
  bridge: boolean;
  laneMarkings: boolean;
}

export interface SegmentMetadata {
  highwayType: string | undefined;
  lanes: number | undefined;
  oneWay: boolean;
  separated: boolean;
  name: string | undefined;
  maxSpeed: number | undefined;
  ref: string | undefined;
  bridge: boolean | undefined;
  laneMarkings: boolean | undefined;
}

export class WorldEditorPanelElement extends HTMLElement {
  #brushState: BrushState = {
    highwayType: undefined,
    lanes: 2,
    oneWay: false,
    separated: false,
    name: '',
    maxSpeed: undefined,
    ref: '',
    bridge: false,
    laneMarkings: true,
  };

  #onBrushChange: ((state: BrushState) => void) | null = null;
  #onToggleO: ((active: boolean) => void) | null = null;
  #onToggleH: ((active: boolean) => void) | null = null;
  #onToggleT: ((active: boolean) => void) | null = null;
  #onMetadataChange: ((meta: Partial<SegmentMetadata>) => void) | null = null;

  #toggleO = new LatchedToggle();
  #toggleH = new LatchedToggle();
  #toggleT = new LatchedToggle();

  #inspectMode: boolean = false;

  #roadTypeSelect: HTMLSelectElement | null = null;
  #autoSetHint: HTMLElement | null = null;
  #lanesInput: HTMLInputElement | null = null;
  #oneWayCheck: HTMLInputElement | null = null;
  #separatedCheck: HTMLInputElement | null = null;
  #nameInput: HTMLInputElement | null = null;
  #maxSpeedInput: HTMLInputElement | null = null;
  #refInput: HTMLInputElement | null = null;
  #bridgeCheck: HTMLInputElement | null = null;
  #laneMarkingsCheck: HTMLInputElement | null = null;
  #keyO: HTMLElement | null = null;
  #keyH: HTMLElement | null = null;
  #keyT: HTMLElement | null = null;

  constructor() {
    super();
    this.id = 'worldEditorPanel';
  }

  connectedCallback(): void {
    this.innerHTML = WORLD_EDITOR_PANEL_TEMPLATE;
    this.#cacheDom();
    this.#populateRoadTypeDropdown();
    this.#wireEvents();
    this.#initToggles();
    this.#syncBrushState();
  }

  #cacheDom(): void {
    this.#roadTypeSelect = this.querySelector('#wepRoadType');
    this.#autoSetHint = this.querySelector('#wepAutoSetHint');
    this.#lanesInput = this.querySelector('#wepLanes');
    this.#oneWayCheck = this.querySelector('#wepOneWay');
    this.#separatedCheck = this.querySelector('#wepSeparated');
    this.#nameInput = this.querySelector('#wepName');
    this.#maxSpeedInput = this.querySelector('#wepMaxSpeed');
    this.#refInput = this.querySelector('#wepRef');
    this.#bridgeCheck = this.querySelector('#wepBridge');
    this.#laneMarkingsCheck = this.querySelector('#wepLaneMarkings');
    this.#keyO = this.querySelector('#wepKeyO');
    this.#keyH = this.querySelector('#wepKeyH');
    this.#keyT = this.querySelector('#wepKeyT');
  }

  #populateRoadTypeDropdown(): void {
    if (!this.#roadTypeSelect) return;
    for (const type of ROAD_TYPES) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = ROAD_TYPE_LABELS[type] ?? type;
      this.#roadTypeSelect.appendChild(option);
    }
  }

  #wireEvents(): void {
    this.#roadTypeSelect?.addEventListener('change', () => {
      const value = this.#roadTypeSelect!.value;
      this.#brushState.highwayType = value || undefined;
      this.#applyAutoSet();
      this.#syncBrushState();
      this.#notifyBrushChange();
    });

    this.#lanesInput?.addEventListener('input', () => {
      this.#brushState.lanes = parseInt(this.#lanesInput!.value, 10) || 2;
      this.#notifyBrushChange();
    });

    this.#oneWayCheck?.addEventListener('change', () => {
      this.#brushState.oneWay = this.#oneWayCheck!.checked;
      this.#notifyBrushChange();
    });

    this.#separatedCheck?.addEventListener('change', () => {
      this.#brushState.separated = this.#separatedCheck!.checked;
      this.#notifyBrushChange();
    });

    this.#nameInput?.addEventListener('input', () => {
      this.#brushState.name = this.#nameInput!.value;
      this.#notifyBrushChange();
    });

    this.#maxSpeedInput?.addEventListener('input', () => {
      const val = this.#maxSpeedInput!.value;
      this.#brushState.maxSpeed = val ? parseInt(val, 10) : undefined;
      this.#notifyBrushChange();
    });

    this.#refInput?.addEventListener('input', () => {
      this.#brushState.ref = this.#refInput!.value;
      this.#notifyBrushChange();
    });

    this.#bridgeCheck?.addEventListener('change', () => {
      this.#brushState.bridge = this.#bridgeCheck!.checked;
      this.#notifyBrushChange();
    });

    this.#laneMarkingsCheck?.addEventListener('change', () => {
      this.#brushState.laneMarkings = this.#laneMarkingsCheck!.checked;
      this.#notifyBrushChange();
    });

    // +/- buttons for lanes
    this.querySelector('#wepLanesDec')?.addEventListener('click', () => {
      if (this.#lanesInput) {
        this.#lanesInput.value = String(
          Math.max(1, parseInt(this.#lanesInput.value, 10) - 1),
        );
        this.#lanesInput.dispatchEvent(new Event('input'));
      }
    });
    this.querySelector('#wepLanesInc')?.addEventListener('click', () => {
      if (this.#lanesInput) {
        this.#lanesInput.value = String(
          Math.min(8, parseInt(this.#lanesInput.value, 10) + 1),
        );
        this.#lanesInput.dispatchEvent(new Event('input'));
      }
    });

    // +/- buttons for maxSpeed
    this.querySelector('#wepMaxSpeedDec')?.addEventListener('click', () => {
      if (this.#maxSpeedInput) {
        const cur = parseInt(this.#maxSpeedInput.value, 10) || 0;
        this.#maxSpeedInput.value = String(Math.max(0, cur - 5));
        this.#maxSpeedInput.dispatchEvent(new Event('input'));
      }
    });
    this.querySelector('#wepMaxSpeedInc')?.addEventListener('click', () => {
      if (this.#maxSpeedInput) {
        const cur = parseInt(this.#maxSpeedInput.value, 10) || 0;
        this.#maxSpeedInput.value = String(cur + 5);
        this.#maxSpeedInput.dispatchEvent(new Event('input'));
      }
    });

    // Collapsible section toggles
    this.querySelector('#wepRoadTypeToggle')?.addEventListener('click', () => {
      this.querySelector('#wepRoadTypeSection')?.classList.toggle('collapsed');
    });
    this.querySelector('#wepPropertiesToggle')?.addEventListener(
      'click',
      () => {
        this.querySelector('#wepPropertiesSection')?.classList.toggle(
          'collapsed',
        );
      },
    );
    this.querySelector('#wepPathToolsToggle')?.addEventListener('click', () => {
      this.querySelector('#wepPathToolsSection')?.classList.toggle('collapsed');
    });
  }

  #initToggles(): void {
    this.#toggleO.setOnChange((active) => {
      this.#keyO?.classList.toggle('active', active);
      this.#onToggleO?.(active);
      if (!this.#inspectMode) {
        this.#brushState.oneWay = active;
        this.#syncBrushState();
      }
    });
    this.#toggleH.setOnChange((active) => {
      this.#keyH?.classList.toggle('active', active);
      this.#onToggleH?.(active);
      if (!this.#inspectMode) {
        this.#brushState.separated = active;
        this.#syncBrushState();
      }
    });
    this.#toggleT.setOnChange((active) => {
      this.#keyT?.classList.toggle('active', active);
      this.#onToggleT?.(active);
    });

    this.#keyO?.addEventListener('click', () => this.#toggleO.toggleLatch());
    this.#keyH?.addEventListener('click', () => this.#toggleH.toggleLatch());
    this.#keyT?.addEventListener('click', () => this.#toggleT.toggleLatch());
  }

  #applyAutoSet(): void {
    const defaults = applyRoadTypeDefaults(this.#brushState.highwayType);
    this.#brushState.lanes = defaults.lanes;
    this.#brushState.oneWay = defaults.oneWay;
    this.#syncBrushState();

    const parts: string[] = [];
    parts.push(`${defaults.lanes} lanes`);
    if (defaults.oneWay) parts.push('one-way');
    if (this.#autoSetHint) {
      this.#autoSetHint.textContent = `Auto-set: ${parts.join(', ')}`;
    }

    this.#toggleO.reset();
    if (defaults.oneWay) {
      this.#toggleO.toggleLatch();
    }
  }

  #syncBrushState(): void {
    if (this.#lanesInput)
      this.#lanesInput.value = String(this.#brushState.lanes);
    if (this.#oneWayCheck) this.#oneWayCheck.checked = this.#brushState.oneWay;
    if (this.#separatedCheck)
      this.#separatedCheck.checked = this.#brushState.separated;
    if (this.#nameInput) this.#nameInput.value = this.#brushState.name;
    if (this.#maxSpeedInput)
      this.#maxSpeedInput.value =
        this.#brushState.maxSpeed !== undefined
          ? String(this.#brushState.maxSpeed)
          : '';
    if (this.#refInput) this.#refInput.value = this.#brushState.ref;
    if (this.#bridgeCheck) this.#bridgeCheck.checked = this.#brushState.bridge;
    if (this.#laneMarkingsCheck)
      this.#laneMarkingsCheck.checked = this.#brushState.laneMarkings;
  }

  #notifyBrushChange(): void {
    if (this.#inspectMode) {
      this.#onMetadataChange?.({
        highwayType: this.#brushState.highwayType,
        lanes: this.#brushState.lanes,
        oneWay: this.#brushState.oneWay,
        separated: this.#brushState.separated,
        name: this.#brushState.name || undefined,
        maxSpeed: this.#brushState.maxSpeed,
        ref: this.#brushState.ref || undefined,
        bridge: this.#brushState.bridge || undefined,
        laneMarkings:
          this.#brushState.laneMarkings === false ? false : undefined,
      });
    } else {
      this.#onBrushChange?.(this.#brushState);
    }
  }

  getBrushState(): BrushState {
    return { ...this.#brushState };
  }

  setBrushChangeListener(cb: (state: BrushState) => void): void {
    this.#onBrushChange = cb;
  }

  setToggleOListener(cb: (active: boolean) => void): void {
    this.#onToggleO = cb;
  }

  setToggleHListener(cb: (active: boolean) => void): void {
    this.#onToggleH = cb;
  }

  setToggleTListener(cb: (active: boolean) => void): void {
    this.#onToggleT = cb;
  }

  getToggleO(): LatchedToggle {
    return this.#toggleO;
  }

  getToggleH(): LatchedToggle {
    return this.#toggleH;
  }

  getToggleT(): LatchedToggle {
    return this.#toggleT;
  }

  setToggleOActive(active: boolean): void {
    if (this.#toggleO.active !== active) {
      this.#toggleO.toggleLatch();
    }
  }

  setToggleHActive(active: boolean): void {
    if (this.#toggleH.active !== active) {
      this.#toggleH.toggleLatch();
    }
  }

  setToggleTActive(active: boolean): void {
    if (this.#toggleT.active !== active) {
      this.#toggleT.toggleLatch();
    }
  }

  showSegmentMetadata(meta: SegmentMetadata | null): void {
    this.#inspectMode = meta !== null;
    if (!meta) {
      this.resetToDefaults();
      return;
    }
    if (this.#roadTypeSelect)
      this.#roadTypeSelect.value = meta.highwayType ?? '';
    if (this.#autoSetHint) this.#autoSetHint.textContent = 'Auto-set: —';
    if (this.#lanesInput)
      this.#lanesInput.value =
        meta.lanes !== undefined ? String(meta.lanes) : '2';
    if (this.#oneWayCheck) this.#oneWayCheck.checked = meta.oneWay;
    if (this.#separatedCheck) this.#separatedCheck.checked = meta.separated;
    if (this.#nameInput) this.#nameInput.value = meta.name ?? '';
    if (this.#maxSpeedInput)
      this.#maxSpeedInput.value =
        meta.maxSpeed !== undefined ? String(meta.maxSpeed) : '';
    if (this.#refInput) this.#refInput.value = meta.ref ?? '';
    if (this.#bridgeCheck) this.#bridgeCheck.checked = meta.bridge ?? false;
    if (this.#laneMarkingsCheck)
      this.#laneMarkingsCheck.checked = meta.laneMarkings !== false;
  }

  setOnMetadataChange(cb: (meta: Partial<SegmentMetadata>) => void): void {
    this.#onMetadataChange = cb;
  }

  resetToDefaults(): void {
    this.#inspectMode = false;
    this.#brushState = {
      highwayType: undefined,
      lanes: 2,
      oneWay: false,
      separated: false,
      name: '',
      maxSpeed: undefined,
      ref: '',
      bridge: false,
      laneMarkings: true,
    };
    if (this.#roadTypeSelect) this.#roadTypeSelect.value = '';
    if (this.#autoSetHint) this.#autoSetHint.textContent = 'Auto-set: —';
    this.#syncBrushState();
    this.#toggleO.reset();
    this.#toggleH.reset();
    this.#toggleT.reset();
  }

  static readonly template = WORLD_EDITOR_PANEL_TEMPLATE;
}

customElements.define('world-editor-panel', WorldEditorPanelElement);
