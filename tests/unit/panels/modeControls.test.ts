// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { ToolbarModeControls } from '../../../ts/ui/molecules/modeControls.js';

function createMockHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.innerHTML = `
    <button id="borderModeNone" data-mode="none">🚫</button>
    <button id="borderModeDamage" data-mode="damage">💀</button>
    <button id="borderModeCollision" data-mode="collision">🛡️</button>
    <button id="trackModeNone" data-mode="none">✋</button>
    <button id="trackModeBest" data-mode="best">🏆</button>
    <button id="trackModeKeys" data-mode="keys">🎮</button>
    <button id="viewportModeMouse" data-mode="mouse">🖱️</button>
    <button id="viewportModeTouchpad" data-mode="touchpad">☝️</button>
  `;
  return host;
}

describe('ToolbarModeControls', () => {
  describe('defaults', () => {
    it('borderMode defaults to "damage"', () => {
      const controls = new ToolbarModeControls(createMockHost());
      expect(controls.borderMode).toBe('damage');
    });

    it('trackingMode defaults to "best"', () => {
      const controls = new ToolbarModeControls(createMockHost());
      expect(controls.trackingMode).toBe('best');
    });

    it('viewportMode defaults to "mouse"', () => {
      const controls = new ToolbarModeControls(createMockHost());
      expect(controls.viewportMode).toBe('mouse');
    });
  });

  describe('setBorderModeListener', () => {
    it('fires callback on button click after init', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      const listener = vi.fn();
      controls.setBorderModeListener(listener);
      controls.init();

      host.querySelector<HTMLButtonElement>('#borderModeCollision')!.click();
      expect(listener).toHaveBeenCalledWith('collision');
      expect(controls.borderMode).toBe('collision');
    });

    it('listener not called without mode change', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      const listener = vi.fn();
      controls.setBorderModeListener(listener);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setTrackingModeListener', () => {
    it('fires callback via setTrackingMode', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      const listener = vi.fn();
      controls.setTrackingModeListener(listener);

      controls.setTrackingMode('keys');
      expect(listener).toHaveBeenCalledWith('keys');
      expect(controls.trackingMode).toBe('keys');
    });
  });

  describe('setViewportModeListener', () => {
    it('fires callback on button click after init', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      const listener = vi.fn();
      controls.setViewportModeListener(listener);
      controls.init();

      host.querySelector<HTMLButtonElement>('#viewportModeTouchpad')!.click();
      expect(listener).toHaveBeenCalledWith('touchpad');
      expect(controls.viewportMode).toBe('touchpad');
    });
  });

  describe('init', () => {
    it('wires border mode buttons', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      controls.init();

      host.querySelector<HTMLButtonElement>('#borderModeNone')!.click();
      expect(controls.borderMode).toBe('none');

      host.querySelector<HTMLButtonElement>('#borderModeDamage')!.click();
      expect(controls.borderMode).toBe('damage');

      host.querySelector<HTMLButtonElement>('#borderModeCollision')!.click();
      expect(controls.borderMode).toBe('collision');
    });

    it('wires tracking mode buttons', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      controls.init();

      host.querySelector<HTMLButtonElement>('#trackModeNone')!.click();
      expect(controls.trackingMode).toBe('none');

      host.querySelector<HTMLButtonElement>('#trackModeBest')!.click();
      expect(controls.trackingMode).toBe('best');

      host.querySelector<HTMLButtonElement>('#trackModeKeys')!.click();
      expect(controls.trackingMode).toBe('keys');
    });

    it('wires viewport mode buttons', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      controls.init();

      host.querySelector<HTMLButtonElement>('#viewportModeMouse')!.click();
      expect(controls.viewportMode).toBe('mouse');

      host.querySelector<HTMLButtonElement>('#viewportModeTouchpad')!.click();
      expect(controls.viewportMode).toBe('touchpad');
    });
  });

  describe('setTrackingMode', () => {
    it('updates internal state and fires onChange callback', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      const listener = vi.fn();
      controls.init();
      controls.setTrackingModeListener(listener);

      controls.setTrackingMode('none');
      expect(controls.trackingMode).toBe('none');
      expect(listener).toHaveBeenCalledWith('none');

      controls.setTrackingMode('keys');
      expect(controls.trackingMode).toBe('keys');
      expect(listener).toHaveBeenCalledWith('keys');
    });

    it('updates button active class', () => {
      const host = createMockHost();
      const controls = new ToolbarModeControls(host);
      controls.init();

      controls.setTrackingMode('keys');
      expect(
        host.querySelector('#trackModeKeys')!.classList.contains('active'),
      ).toBe(true);
      expect(
        host.querySelector('#trackModeBest')!.classList.contains('active'),
      ).toBe(false);
      expect(
        host.querySelector('#trackModeNone')!.classList.contains('active'),
      ).toBe(false);

      controls.setTrackingMode('best');
      expect(
        host.querySelector('#trackModeBest')!.classList.contains('active'),
      ).toBe(true);
      expect(
        host.querySelector('#trackModeKeys')!.classList.contains('active'),
      ).toBe(false);
    });
  });
});
