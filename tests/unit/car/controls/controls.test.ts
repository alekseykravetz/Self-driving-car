import { describe, it, expect } from 'vitest';
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
