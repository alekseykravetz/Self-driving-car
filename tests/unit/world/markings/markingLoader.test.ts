import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../../helpers/setupImageMock.js';
import { loadMarking } from '../../../../ts/world/markings/markingLoader.js';

// Start and other marking types may create Image() in their constructors
setupImageMock();

const baseInfo = {
  center: { x: 0, y: 0 },
  directionVector: { x: 1, y: 0 },
  width: 3,
  height: 3,
};

describe('loadMarking', () => {
  it('loads type "stop" as a Stop marking', () => {
    const marking = loadMarking({
      type: 'stop',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('stop');
  });

  it('loads type "light" as a Light marking', () => {
    const marking = loadMarking({
      type: 'light',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('light');
  });

  it('loads type "crossing" as a Crossing marking', () => {
    const marking = loadMarking({
      type: 'crossing',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('crossing');
  });

  it('loads type "parking" as a Parking marking', () => {
    const marking = loadMarking({
      type: 'parking',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('parking');
  });

  it('loads type "start" as a Start marking', () => {
    const marking = loadMarking({
      type: 'start',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('start');
  });

  it('loads type "yield" as a Yield marking', () => {
    const marking = loadMarking({
      type: 'yield',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('yield');
  });

  it('loads type "target" as a Target marking', () => {
    const marking = loadMarking({
      type: 'target',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('target');
  });

  it('loads type "marking" as a base Marking', () => {
    const marking = loadMarking({
      type: 'marking',
      ...baseInfo,
    });
    expect(marking).not.toBeNull();
    expect(marking!.type).toBe('marking');
  });

  it('returns null for unknown type', () => {
    const marking = loadMarking({
      // @ts-expect-error testing unknown type
      type: 'nonexistent',
      ...baseInfo,
    });
    expect(marking).toBeNull();
  });

  it('restores anchor data when present', () => {
    const marking = loadMarking({
      type: 'stop',
      ...baseInfo,
      anchor: {
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        offset: 0.5,
        lateral: 2,
      },
    });
    expect(marking).not.toBeNull();
    expect(marking!.anchor).toBeDefined();
    expect(marking!.anchor!.offset).toBe(0.5);
    expect(marking!.anchor!.lateral).toBe(2);
  });
});
