// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolbarAssetSelectors } from '../../../ts/ui/organisms/assetSelectors.js';
import { StoreManager } from '../../../ts/store/storeManager.js';
import type {
  UnifiedWorldEntry,
  UnifiedCarEntry,
} from '../../../ts/store/types.js';
import type { CarInfo } from '../../../ts/car/car.js';

function createHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.innerHTML = `
    <div data-group="selected" style="display:none"></div>
    <div id="worldPickerList"></div>
    <div id="carPickerList"></div>
    <button id="loadWorldBtn"></button>
    <div id="worldPicker" hidden></div>
    <button id="loadCarBtn"></button>
    <div id="carPicker" hidden></div>
    <input id="loadWorldInput" type="file" />
    <input id="loadCarInput" type="file" multiple />
    <span id="selectedWorldName">—</span>
    <span id="selectedCarNames">—</span>
  `;
  return host;
}

const SAMPLE_CAR_DATA: CarInfo = {
  maxSpeed: 3,
  friction: 0.05,
  acceleration: 0.04,
  width: 30,
  height: 50,
  sensor: { rayCount: 5, raySpread: Math.PI / 2, rayLength: 200, rayOffset: 0 },
};

interface MockStoreInstance {
  setActiveWorldId: ReturnType<typeof vi.fn>;
  setActiveCarIds: ReturnType<typeof vi.fn>;
  toggleActiveCarId: ReturnType<typeof vi.fn>;
  addLoadedWorld: ReturnType<typeof vi.fn>;
  addLoadedCar: ReturnType<typeof vi.fn>;
}

function mockInstance(): MockStoreInstance {
  return {
    setActiveWorldId: vi.fn(),
    setActiveCarIds: vi.fn(),
    toggleActiveCarId: vi.fn(),
    addLoadedWorld: vi.fn(),
    addLoadedCar: vi.fn(),
  };
}

describe('ToolbarAssetSelectors', () => {
  let selectors: ToolbarAssetSelectors;
  let host: HTMLDivElement;
  let instance: MockStoreInstance;

  beforeEach(() => {
    vi.restoreAllMocks();
    host = createHost();
    selectors = new ToolbarAssetSelectors(host);

    instance = mockInstance();

    vi.spyOn(StoreManager, 'getInstance').mockReturnValue(
      instance as unknown as ReturnType<typeof StoreManager.getInstance>,
    );
    vi.spyOn(StoreManager, 'getAllWorlds').mockReturnValue([]);
    vi.spyOn(StoreManager, 'getAllCars').mockReturnValue([]);
    vi.spyOn(StoreManager, 'getActiveWorldId').mockReturnValue('');
    vi.spyOn(StoreManager, 'getActiveCarIds').mockReturnValue([]);
    vi.spyOn(StoreManager, 'getActiveCars').mockReturnValue([]);
    vi.spyOn(StoreManager, 'getActiveWorldName').mockReturnValue(null);
    vi.spyOn(StoreManager, 'getActiveCarNames').mockReturnValue([]);
  });

  it('constructor stores host reference', () => {
    expect(selectors).toBeTruthy();
  });

  describe('configureSelectors', () => {
    it('stores callbacks and refreshes world/car lists', () => {
      const onWorldSelected = vi.fn();
      const onCarsSelected = vi.fn();

      selectors.configureSelectors({
        carMode: 'single',
        selectOnWorldFileLoad: true,
        onWorldSelected,
        onCarsSelected,
      });

      expect(StoreManager.getAllWorlds).toHaveBeenCalled();
      expect(StoreManager.getAllCars).toHaveBeenCalled();
    });

    it('shows the selected group', () => {
      const selectedGroup = host.querySelector(
        '[data-group="selected"]',
      ) as HTMLElement;
      selectedGroup.style.display = 'none';

      selectors.configureSelectors({});
      expect(selectedGroup.style.display).toBe('');
    });
  });

  describe('refreshWorldList', () => {
    it('renders "No worlds" when list is empty', () => {
      selectors.refreshWorldList();

      const list = host.querySelector('#worldPickerList')!;
      expect(list.innerHTML).toContain('No worlds');
    });

    it('renders world items when worlds exist', () => {
      const worlds: UnifiedWorldEntry[] = [
        {
          id: 'w1',
          name: 'World1.world',
          source: 'store',
          data: {},
          hasStartMarker: false,
          hasEndMarker: false,
        },
        {
          id: 'w2',
          name: 'World2.world',
          source: 'store',
          data: {},
          hasStartMarker: false,
          hasEndMarker: false,
        },
      ];
      vi.spyOn(StoreManager, 'getAllWorlds').mockReturnValue(worlds);
      vi.spyOn(StoreManager, 'getActiveWorldId').mockReturnValue('w1');

      selectors.refreshWorldList();

      const list = host.querySelector('#worldPickerList')!;
      const items = list.querySelectorAll('.asset-item');
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toContain('World1');
      expect(items[1].textContent).toContain('World2');
    });

    it('radio change selects a world', () => {
      const worlds: UnifiedWorldEntry[] = [
        {
          id: 'w1',
          name: 'World1.world',
          source: 'store',
          data: {},
          hasStartMarker: false,
          hasEndMarker: false,
        },
      ];
      vi.spyOn(StoreManager, 'getAllWorlds').mockReturnValue(worlds);
      vi.spyOn(StoreManager, 'getActiveWorldId').mockReturnValue('');

      selectors.configureSelectors({
        onWorldSelected: vi.fn(),
      });

      const radio = host.querySelector<HTMLInputElement>(
        'input[name="wt-world"]',
      )!;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));

      expect(instance.setActiveWorldId).toHaveBeenCalledWith('w1');
    });
  });

  describe('refreshCarList', () => {
    it('renders "No cars" when list is empty', () => {
      selectors.refreshCarList();

      const list = host.querySelector('#carPickerList')!;
      expect(list.innerHTML).toContain('No cars');
    });

    it('renders car items when cars exist', () => {
      const cars: UnifiedCarEntry[] = [
        { id: 'c1', name: 'Car1.car', source: 'store', data: SAMPLE_CAR_DATA },
        { id: 'c2', name: 'Car2.car', source: 'store', data: SAMPLE_CAR_DATA },
      ];
      vi.spyOn(StoreManager, 'getAllCars').mockReturnValue(cars);
      vi.spyOn(StoreManager, 'getActiveCarIds').mockReturnValue(['c1']);

      selectors.refreshCarList();

      const list = host.querySelector('#carPickerList')!;
      const items = list.querySelectorAll('.asset-item');
      expect(items).toHaveLength(2);
    });

    it('uses radio inputs in single mode', () => {
      const cars: UnifiedCarEntry[] = [
        { id: 'c1', name: 'Car1.car', source: 'store', data: SAMPLE_CAR_DATA },
      ];
      vi.spyOn(StoreManager, 'getAllCars').mockReturnValue(cars);
      vi.spyOn(StoreManager, 'getActiveCarIds').mockReturnValue([]);

      selectors.configureSelectors({ carMode: 'single' });

      const input = host.querySelector<HTMLInputElement>(
        'input[name="wt-car"]',
      )!;
      expect(input.type).toBe('radio');
    });

    it('uses checkbox inputs in multi mode', () => {
      const cars: UnifiedCarEntry[] = [
        { id: 'c1', name: 'Car1.car', source: 'store', data: SAMPLE_CAR_DATA },
      ];
      vi.spyOn(StoreManager, 'getAllCars').mockReturnValue(cars);
      vi.spyOn(StoreManager, 'getActiveCarIds').mockReturnValue([]);

      selectors.configureSelectors({ carMode: 'multi' });

      const input = host.querySelector<HTMLInputElement>(
        'input[name="wt-car"]',
      )!;
      expect(input.type).toBe('checkbox');
    });
  });

  describe('setCarSelectorMode', () => {
    it('changes mode and refreshes list', () => {
      const cars: UnifiedCarEntry[] = [
        { id: 'c1', name: 'Car1.car', source: 'store', data: SAMPLE_CAR_DATA },
      ];
      vi.spyOn(StoreManager, 'getAllCars').mockReturnValue(cars);
      vi.spyOn(StoreManager, 'getActiveCarIds').mockReturnValue([]);

      selectors.configureSelectors({ carMode: 'single' });
      selectors.setCarSelectorMode('multi');

      const input = host.querySelector<HTMLInputElement>(
        'input[name="wt-car"]',
      )!;
      expect(input.type).toBe('checkbox');
    });
  });

  describe('getSelectedCars', () => {
    it('returns active cars from StoreManager', () => {
      const mockCars: CarInfo[] = [SAMPLE_CAR_DATA];
      vi.spyOn(StoreManager, 'getActiveCars').mockReturnValue(mockCars);

      const result = selectors.getSelectedCars();
      expect(result).toBe(mockCars);
    });
  });
});
