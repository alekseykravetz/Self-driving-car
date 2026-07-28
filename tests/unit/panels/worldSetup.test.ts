// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldToolbarElement } from '../../../ts/ui/molecules/worldToolbar.js';

function createElement(): WorldToolbarElement {
  const el = new WorldToolbarElement();
  document.body.appendChild(el);
  el.connectedCallback();
  return el;
}

describe('WorldToolbarElement', () => {
  let el: WorldToolbarElement;

  beforeEach(() => {
    el = createElement();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('constructed with modeControls and assetSelectors', () => {
    expect(el.id).toBe('topControls');
    expect(el.borderMode).toBe('damage');
    expect(el.trackingMode).toBe('best');
    expect(el.viewportMode).toBe('mouse');
  });

  it('connectedCallback renders and initializes mode controls', () => {
    const borderBtns = el.querySelectorAll(
      '#borderModeNone, #borderModeDamage, #borderModeCollision',
    );
    expect(borderBtns.length).toBe(3);

    const trackBtns = el.querySelectorAll(
      '#trackModeNone, #trackModeBest, #trackModeKeys',
    );
    expect(trackBtns.length).toBe(3);

    const viewportBtns = el.querySelectorAll(
      '#viewportModeMouse, #viewportModeTouchpad',
    );
    expect(viewportBtns.length).toBe(2);
  });

  it('delegates borderMode', () => {
    expect(el.borderMode).toBe('damage');

    el.querySelector<HTMLButtonElement>('#borderModeCollision')!.click();
    expect(el.borderMode).toBe('collision');
  });

  it('delegates trackingMode', () => {
    expect(el.trackingMode).toBe('best');

    el.querySelector<HTMLButtonElement>('#trackModeNone')!.click();
    expect(el.trackingMode).toBe('none');
  });

  it('delegates viewportMode', () => {
    expect(el.viewportMode).toBe('mouse');

    el.querySelector<HTMLButtonElement>('#viewportModeTouchpad')!.click();
    expect(el.viewportMode).toBe('touchpad');
  });

  it('showCameraDebug defaults to false', () => {
    expect(el.showCameraDebug).toBe(false);
  });

  it('hideCameraDebug hides debug groups', () => {
    el.hideCameraDebug();

    const debugGroup = el.querySelector('[data-group="debug"]') as HTMLElement;
    expect(debugGroup.style.display).toBe('none');

    const debugSep = el.querySelector(
      '[data-group="debug-sep"]',
    ) as HTMLElement;
    expect(debugSep.style.display).toBe('none');
  });

  it('setBorderModeListener receives border mode changes', () => {
    const listener = vi.fn();
    el.setBorderModeListener(listener);

    el.querySelector<HTMLButtonElement>('#borderModeNone')!.click();
    expect(listener).toHaveBeenCalledWith('none');
  });

  it('setTrackingMode sets tracking mode programmatically', () => {
    el.setTrackingMode('keys');
    expect(el.trackingMode).toBe('keys');
  });

  it('hideGroups hides elements with matching data-group', () => {
    el.hideGroups('borders', 'tracking');

    const borderGroup = el.querySelector(
      '[data-group="borders"]',
    ) as HTMLElement;
    expect(borderGroup.style.display).toBe('none');

    const trackingGroup = el.querySelector(
      '[data-group="tracking"]',
    ) as HTMLElement;
    expect(trackingGroup.style.display).toBe('none');
  });
});
