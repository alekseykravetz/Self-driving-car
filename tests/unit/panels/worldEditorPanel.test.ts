// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldEditorPanelElement } from '../../../ts/ui/organisms/worldEditorPanel.js';
import { ROAD_TYPES, ROAD_TYPE_LABELS } from '../../../ts/math/roadTypes.js';

function createElement(): WorldEditorPanelElement {
  const el = new WorldEditorPanelElement();
  document.body.appendChild(el);
  el.connectedCallback();
  return el;
}

describe('WorldEditorPanelElement', () => {
  let el: WorldEditorPanelElement;

  beforeEach(() => {
    el = createElement();
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.clearAllMocks();
  });

  it('connectedCallback renders template', () => {
    const sections = el.querySelectorAll('.wep-section');
    expect(sections.length).toBe(3);
    expect(el.querySelector('#wepRoadType')).toBeTruthy();
    expect(el.querySelector('#wepLanes')).toBeTruthy();
    expect(el.querySelector('#wepKeyO')).toBeTruthy();
  });

  it('road type dropdown is populated with all ROAD_TYPES', () => {
    const select = el.querySelector('#wepRoadType') as HTMLSelectElement;
    const options = Array.from(select.options);
    const optionValues = options.map((o) => o.value);
    const optionTexts = options.map((o) => o.textContent);

    for (const type of ROAD_TYPES) {
      expect(optionValues).toContain(type);
      expect(optionTexts).toContain(ROAD_TYPE_LABELS[type]);
    }
  });

  it('getBrushState() returns defaults after construction', () => {
    const state = el.getBrushState();
    expect(state.highwayType).toBeUndefined();
    expect(state.lanes).toBe(2);
    expect(state.oneWay).toBe(false);
    expect(state.separated).toBe(false);
    expect(state.name).toBe('');
    expect(state.maxSpeed).toBeUndefined();
    expect(state.ref).toBe('');
    expect(state.bridge).toBe(false);
    expect(state.laneMarkings).toBe(true);
  });

  it('changing road type fires setBrushChangeListener with updated highwayType', () => {
    const listener = vi.fn();
    el.setBrushChangeListener(listener);

    const select = el.querySelector('#wepRoadType') as HTMLSelectElement;
    select.value = 'motorway';
    select.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalled();
    const state = listener.mock.calls[0][0];
    expect(state.highwayType).toBe('motorway');
  });

  it('selecting motorway auto-sets lanes=4 and oneWay=true', () => {
    const select = el.querySelector('#wepRoadType') as HTMLSelectElement;
    select.value = 'motorway';
    select.dispatchEvent(new Event('change'));

    const lanesInput = el.querySelector('#wepLanes') as HTMLInputElement;
    const oneWayCheck = el.querySelector('#wepOneWay') as HTMLInputElement;
    expect(lanesInput.value).toBe('4');
    expect(oneWayCheck.checked).toBe(true);
  });

  it('toggling O indicator fires the respective listener', () => {
    const listener = vi.fn();
    el.setToggleOListener(listener);

    const keyO = el.querySelector('#wepKeyO') as HTMLElement;
    keyO.click();

    expect(listener).toHaveBeenCalledWith(true);
  });

  it('toggling H indicator fires the respective listener', () => {
    const listener = vi.fn();
    el.setToggleHListener(listener);

    const keyH = el.querySelector('#wepKeyH') as HTMLElement;
    keyH.click();

    expect(listener).toHaveBeenCalledWith(true);
  });

  it('toggling T indicator fires the respective listener', () => {
    const listener = vi.fn();
    el.setToggleTListener(listener);

    const keyT = el.querySelector('#wepKeyT') as HTMLElement;
    keyT.click();

    expect(listener).toHaveBeenCalledWith(true);
  });

  it('showSegmentMetadata populates fields from a metadata object', () => {
    el.showSegmentMetadata({
      highwayType: 'trunk',
      lanes: 4,
      oneWay: false,
      separated: false,
      name: 'Test Road',
      maxSpeed: 80,
      ref: 'T1',
      bridge: true,
      laneMarkings: true,
    });

    const lanesInput = el.querySelector('#wepLanes') as HTMLInputElement;
    const nameInput = el.querySelector('#wepName') as HTMLInputElement;
    const maxSpeedInput = el.querySelector('#wepMaxSpeed') as HTMLInputElement;
    const refInput = el.querySelector('#wepRef') as HTMLInputElement;
    const bridgeCheck = el.querySelector('#wepBridge') as HTMLInputElement;

    expect(lanesInput.value).toBe('4');
    expect(nameInput.value).toBe('Test Road');
    expect(maxSpeedInput.value).toBe('80');
    expect(refInput.value).toBe('T1');
    expect(bridgeCheck.checked).toBe(true);
  });

  it('showSegmentMetadata(null) resets to brush mode', () => {
    el.showSegmentMetadata({
      highwayType: 'motorway',
      lanes: 4,
      oneWay: true,
      separated: false,
      name: 'M1',
      maxSpeed: 120,
      ref: 'M1',
      bridge: false,
      laneMarkings: true,
    });

    const nameInput = el.querySelector('#wepName') as HTMLInputElement;
    expect(nameInput.value).toBe('M1');

    el.showSegmentMetadata(null);

    expect(nameInput.value).toBe('');
    const lanesInput = el.querySelector('#wepLanes') as HTMLInputElement;
    expect(lanesInput.value).toBe('2');
  });

  it('resetToDefaults() clears all fields', () => {
    el.showSegmentMetadata({
      highwayType: 'motorway',
      lanes: 4,
      oneWay: true,
      separated: true,
      name: 'Test',
      maxSpeed: 100,
      ref: 'A1',
      bridge: true,
      laneMarkings: false,
    });

    el.resetToDefaults();

    const state = el.getBrushState();
    expect(state.highwayType).toBeUndefined();
    expect(state.lanes).toBe(2);
    expect(state.oneWay).toBe(false);
    expect(state.separated).toBe(false);
    expect(state.name).toBe('');
    expect(state.maxSpeed).toBeUndefined();
    expect(state.ref).toBe('');
    expect(state.bridge).toBe(false);
    expect(state.laneMarkings).toBe(true);
  });
});
