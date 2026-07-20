import { describe, it, expect } from 'vitest';
import { LatchedToggle } from '../../../ts/ui/atoms/latchedToggle.js';

describe('LatchedToggle', () => {
  it('initial state is inactive', () => {
    const toggle = new LatchedToggle();
    expect(toggle.active).toBe(false);
  });

  it('setPhysicalHold(true) activates', () => {
    const toggle = new LatchedToggle();
    toggle.setPhysicalHold(true);
    expect(toggle.active).toBe(true);
  });

  it('setPhysicalHold(false) deactivates after hold', () => {
    const toggle = new LatchedToggle();
    toggle.setPhysicalHold(true);
    expect(toggle.active).toBe(true);
    toggle.setPhysicalHold(false);
    expect(toggle.active).toBe(false);
  });

  it('toggleLatch() toggles active on/off', () => {
    const toggle = new LatchedToggle();
    toggle.toggleLatch();
    expect(toggle.active).toBe(true);
    toggle.toggleLatch();
    expect(toggle.active).toBe(false);
  });

  it('latch persists after physical hold released', () => {
    const toggle = new LatchedToggle();
    toggle.setPhysicalHold(true);
    toggle.toggleLatch();
    expect(toggle.active).toBe(true);
    toggle.setPhysicalHold(false);
    expect(toggle.active).toBe(true);
    toggle.toggleLatch();
    expect(toggle.active).toBe(false);
  });

  it('reset() clears hold and latch', () => {
    const toggle = new LatchedToggle();
    toggle.setPhysicalHold(true);
    toggle.toggleLatch();
    expect(toggle.active).toBe(true);
    toggle.reset();
    expect(toggle.active).toBe(false);
  });

  it('onChange fires on state change', () => {
    const toggle = new LatchedToggle();
    const changes: boolean[] = [];
    toggle.setOnChange((active) => changes.push(active));
    toggle.setPhysicalHold(true);
    expect(changes).toEqual([true]);
    toggle.setPhysicalHold(false);
    expect(changes).toEqual([true, false]);
  });

  it('onChange does not fire when state unchanged', () => {
    const toggle = new LatchedToggle();
    let callCount = 0;
    toggle.setOnChange(() => callCount++);
    toggle.setPhysicalHold(true);
    toggle.setPhysicalHold(true);
    toggle.setPhysicalHold(true);
    expect(callCount).toBe(1);
  });

  it('reset() fires onChange', () => {
    const toggle = new LatchedToggle();
    const changes: boolean[] = [];
    toggle.setOnChange((active) => changes.push(active));
    toggle.setPhysicalHold(true);
    toggle.reset();
    expect(changes).toEqual([true, false]);
  });
});
