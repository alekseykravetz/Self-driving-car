import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controls, ControlType } from '../../../../ts/car/controls/controls.js';

describe('Controls', () => {
  it('DUMMY type has forward=true, others false', () => {
    const ctrl = new Controls('DUMMY');
    expect(ctrl.forward).toBe(true);
    expect(ctrl.left).toBe(false);
    expect(ctrl.right).toBe(false);
    expect(ctrl.reverse).toBe(false);
  });

  it('DUMMY type via enum works', () => {
    const ctrl = new Controls(ControlType.DUMMY);
    expect(ctrl.forward).toBe(true);
  });

  it('AI type has all inputs false', () => {
    const ctrl = new Controls('AI');
    expect(ctrl.forward).toBe(false);
    expect(ctrl.left).toBe(false);
    expect(ctrl.right).toBe(false);
    expect(ctrl.reverse).toBe(false);
  });

  it('AI type via enum works', () => {
    const ctrl = new Controls(ControlType.AI);
    expect(ctrl.forward).toBe(false);
  });

  it('frozen defaults to false', () => {
    const ctrl = new Controls('AI');
    expect(ctrl.frozen).toBe(false);
  });

  it('properties can be set directly on AI instance', () => {
    const ctrl = new Controls('AI');
    ctrl.forward = true;
    ctrl.left = true;
    ctrl.right = true;
    ctrl.reverse = true;
    expect(ctrl.forward).toBe(true);
    expect(ctrl.left).toBe(true);
    expect(ctrl.right).toBe(true);
    expect(ctrl.reverse).toBe(true);
  });

  it('frozen property can be set', () => {
    const ctrl = new Controls('AI');
    ctrl.frozen = true;
    expect(ctrl.frozen).toBe(true);
  });

  it('KEYS type throws in Node (document is not defined) — validates DOM dependency', () => {
    expect(() => new Controls('KEYS')).toThrow();
  });

  it('frozen flag persists after being set', () => {
    const ctrl = new Controls('AI');
    ctrl.frozen = true;
    expect(ctrl.frozen).toBe(true);
    expect(ctrl.frozen).toBe(true);
    ctrl.forward = true;
    expect(ctrl.frozen).toBe(true);
  });

  it('frozen flag can be toggled back to false', () => {
    const ctrl = new Controls('AI');
    ctrl.frozen = true;
    expect(ctrl.frozen).toBe(true);
    ctrl.frozen = false;
    expect(ctrl.frozen).toBe(false);
  });

  it('unknown control type string defaults to all false', () => {
    const ctrl = new Controls('UNKNOWN');
    expect(ctrl.forward).toBe(false);
    expect(ctrl.left).toBe(false);
    expect(ctrl.right).toBe(false);
    expect(ctrl.reverse).toBe(false);
    expect(ctrl.frozen).toBe(false);
  });

  it('individual properties remain set after assignment', () => {
    const ctrl = new Controls('AI');
    ctrl.forward = true;
    ctrl.reverse = true;
    expect(ctrl.forward).toBe(true);
    expect(ctrl.reverse).toBe(true);
    expect(ctrl.left).toBe(false);
    expect(ctrl.right).toBe(false);
  });
});

describe('Controls KEYS type', () => {
  let handlers: Record<string, ((e: KeyboardEvent) => void)[]>;

  beforeEach(() => {
    handlers = {};
    vi.stubGlobal('document', {
      addEventListener: (type: string, fn: (e: KeyboardEvent) => void) => {
        (handlers[type] ??= []).push(fn);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function dispatch(type: 'keydown' | 'keyup', key: string): void {
    for (const fn of handlers[type] ?? []) fn({ key } as KeyboardEvent);
  }

  it('registers keydown and keyup listeners', () => {
    new Controls('KEYS');
    expect(handlers['keydown']).toHaveLength(1);
    expect(handlers['keyup']).toHaveLength(1);
  });

  it.each([
    ['ArrowUp', 'forward'],
    ['w', 'forward'],
    ['ArrowDown', 'reverse'],
    ['s', 'reverse'],
    ['ArrowLeft', 'left'],
    ['a', 'left'],
    ['ArrowRight', 'right'],
    ['d', 'right'],
  ] as const)('keydown "%s" sets %s true, keyup clears it', (key, prop) => {
    const c = new Controls('KEYS');
    dispatch('keydown', key);
    expect(c[prop]).toBe(true);
    dispatch('keyup', key);
    expect(c[prop]).toBe(false);
  });

  it('unrelated keys do not change any control', () => {
    const c = new Controls('KEYS');
    dispatch('keydown', 'x');
    expect(c.forward).toBe(false);
    expect(c.left).toBe(false);
    expect(c.right).toBe(false);
    expect(c.reverse).toBe(false);
  });

  it('frozen ignores keydown input', () => {
    const c = new Controls('KEYS');
    c.frozen = true;
    dispatch('keydown', 'w');
    expect(c.forward).toBe(false);
  });

  it('frozen ignores keyup input (state is preserved)', () => {
    const c = new Controls('KEYS');
    dispatch('keydown', 'w');
    expect(c.forward).toBe(true);
    c.frozen = true;
    dispatch('keyup', 'w');
    // keyup ignored while frozen, so forward stays true
    expect(c.forward).toBe(true);
  });
});
