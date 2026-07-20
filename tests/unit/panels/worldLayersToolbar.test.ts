// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldLayersToolbarElement } from '../../../ts/ui/molecules/worldLayersToolbar.js';
import { DEFAULT_LAYER_VISIBILITY } from '../../../ts/world/types.js';

function createElement(): WorldLayersToolbarElement {
  const el = new WorldLayersToolbarElement();
  document.body.appendChild(el);
  el.connectedCallback();
  return el;
}

describe('WorldLayersToolbarElement', () => {
  let el: WorldLayersToolbarElement;

  beforeEach(() => {
    el = createElement();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('connectedCallback renders layer toggles', () => {
    const btns = el.querySelectorAll('.layer-toggle');
    expect(btns.length).toBeGreaterThanOrEqual(6);
  });

  describe('toggle sets/unsets active class', () => {
    it('clicking a layer toggle toggles its active class', () => {
      const btn = el.querySelector<HTMLButtonElement>('[data-layer="roads"]')!;

      btn.click();
      expect(btn.classList.contains('active')).toBe(false);

      btn.click();
      expect(btn.classList.contains('active')).toBe(true);
    });

    it('clicking layer toggle fires change listener', () => {
      const listener = vi.fn();
      el.setChangeListener(listener);

      el.querySelector<HTMLButtonElement>('[data-layer="markings"]')!.click();
      expect(listener).toHaveBeenCalledTimes(1);
      const vis = listener.mock.calls[0][0];
      expect(vis.markings).toBe(false);
    });
  });

  describe('setVisibility', () => {
    it('updates button state from visibility object', () => {
      const roadsBtn = el.querySelector<HTMLButtonElement>(
        '[data-layer="roads"]',
      )!;
      expect(roadsBtn.classList.contains('active')).toBe(true);

      el.setVisibility({ ...DEFAULT_LAYER_VISIBILITY, roads: false });
      expect(roadsBtn.classList.contains('active')).toBe(false);

      el.setVisibility({ ...DEFAULT_LAYER_VISIBILITY, roads: true });
      expect(roadsBtn.classList.contains('active')).toBe(true);
    });
  });

  describe('getVisibility', () => {
    it('returns a copy of current visibility', () => {
      const vis = el.getVisibility();
      expect(vis.roads).toBe(true);
      expect(vis.markings).toBe(true);
      expect(vis.trees).toBe(true);
      expect(vis.buildings).toBe(true);

      vis.roads = false;
      const vis2 = el.getVisibility();
      expect(vis2.roads).toBe(true);
    });
  });

  describe('setAutoRegen', () => {
    it('updates auto-regen state and button', () => {
      const regenBtn = el.querySelector<HTMLButtonElement>(
        '#regenerateItemsBtn',
      )!;

      el.setAutoRegen(true);
      expect(regenBtn.classList.contains('active')).toBe(true);

      el.setAutoRegen(false);
      expect(regenBtn.classList.contains('active')).toBe(false);
    });
  });

  describe('setAutoRegenListener', () => {
    it('fires callback when regenerate button is clicked', () => {
      const listener = vi.fn();
      el.setAutoRegenListener(listener);

      const regenBtn = el.querySelector<HTMLButtonElement>(
        '#regenerateItemsBtn',
      )!;
      regenBtn.click();

      expect(listener).toHaveBeenCalledWith(true);
      regenBtn.click();
      expect(listener).toHaveBeenCalledWith(false);
    });
  });

  describe('showHeatmap', () => {
    it('getter returns current state', () => {
      expect(el.showHeatmap).toBe(false);
    });
  });

  describe('setShowHeatmap', () => {
    it('updates heatmap button state', () => {
      const heatmapBtn =
        el.querySelector<HTMLButtonElement>('#showHeatmapBtn')!;

      el.setShowHeatmap(true);
      expect(heatmapBtn.classList.contains('active')).toBe(true);
      expect(el.showHeatmap).toBe(true);

      el.setShowHeatmap(false);
      expect(heatmapBtn.classList.contains('active')).toBe(false);
      expect(el.showHeatmap).toBe(false);
    });
  });

  describe('setHeatmapChangeListener', () => {
    it('fires callback when heatmap button is clicked', () => {
      const listener = vi.fn();
      el.setHeatmapChangeListener(listener);

      el.querySelector<HTMLButtonElement>('#showHeatmapBtn')!.click();
      expect(listener).toHaveBeenCalledWith(true);
    });
  });

  describe('setStale', () => {
    it('adds stale class to regenerate button', () => {
      el.setStale(true);
      const regenBtn = el.querySelector<HTMLButtonElement>(
        '#regenerateItemsBtn',
      )!;
      expect(regenBtn.classList.contains('stale')).toBe(true);
    });

    it('removes stale class', () => {
      el.setStale(true);
      el.setStale(false);
      const regenBtn = el.querySelector<HTMLButtonElement>(
        '#regenerateItemsBtn',
      )!;
      expect(regenBtn.classList.contains('stale')).toBe(false);
    });

    it('does not add stale when autoRegen is on', () => {
      el.setAutoRegen(true);
      el.setStale(true);
      const regenBtn = el.querySelector<HTMLButtonElement>(
        '#regenerateItemsBtn',
      )!;
      expect(regenBtn.classList.contains('stale')).toBe(false);
    });
  });

  describe('setBusy', () => {
    it('toggles busy class and disabled attribute', () => {
      const regenBtn = el.querySelector<HTMLButtonElement>(
        '#regenerateItemsBtn',
      )!;

      el.setBusy(true);
      expect(regenBtn.classList.contains('busy')).toBe(true);
      expect(regenBtn.disabled).toBe(true);

      el.setBusy(false);
      expect(regenBtn.classList.contains('busy')).toBe(false);
      expect(regenBtn.disabled).toBe(false);
    });
  });

  describe('hideItems', () => {
    it('hides elements with data-items attribute', () => {
      el.hideItems();

      const items = el.querySelectorAll<HTMLElement>('[data-items]');
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        expect(item.style.display).toBe('none');
      });
    });
  });

  describe('hideOverlays', () => {
    it('hides elements with data-overlays attribute', () => {
      el.hideOverlays();

      const overlays = el.querySelectorAll<HTMLElement>('[data-overlays]');
      expect(overlays.length).toBeGreaterThan(0);
      overlays.forEach((overlay) => {
        expect(overlay.style.display).toBe('none');
      });
    });
  });
});
