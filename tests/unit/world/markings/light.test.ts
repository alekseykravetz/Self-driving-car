import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Light } from '../../../../ts/world/markings/light.js';
import { mockCanvas2D } from '../../../helpers/mockCanvas2D.js';

function makeLight(): Light {
  return new Light(new Point(100, 100), new Point(1, 0), 50);
}

describe('Light', () => {
  it('constructor creates Light with correct defaults', () => {
    const light = makeLight();
    expect(light.type).toBe('light');
    expect(light.state).toBe('off');
    expect(light.overridden).toBe(false);
  });

  it('border is polygon.segments[0]', () => {
    const light = makeLight();
    expect(light.border).toBe(light.polygon.segments[0]);
  });

  it('override("green") sets state and overridden flag', () => {
    const light = makeLight();
    light.override('green');
    expect(light.state).toBe('green');
    expect(light.overridden).toBe(true);
  });

  it('override("yellow") sets state to yellow', () => {
    const light = makeLight();
    light.override('yellow');
    expect(light.state).toBe('yellow');
    expect(light.overridden).toBe(true);
  });

  it('override("red") sets state to red', () => {
    const light = makeLight();
    light.override('red');
    expect(light.state).toBe('red');
    expect(light.overridden).toBe(true);
  });

  it('override twice changes state but keeps overridden', () => {
    const light = makeLight();
    light.override('green');
    expect(light.state).toBe('green');
    expect(light.overridden).toBe(true);

    light.override('yellow');
    expect(light.state).toBe('yellow');
    expect(light.overridden).toBe(true);
  });

  it('releaseOverride() clears overridden flag', () => {
    const light = makeLight();
    light.override('green');
    expect(light.overridden).toBe(true);

    light.releaseOverride();
    expect(light.overridden).toBe(false);
    expect(light.state).toBe('green');
  });

  it('rebuildGeometry() updates border', () => {
    const light = makeLight();
    const originalBorder = light.border;
    light.center = new Point(200, 200);
    light.rebuildGeometry();
    expect(light.border).not.toBe(originalBorder);
    expect(light.border).toBe(light.polygon.segments[0]);
  });
});

describe('Light.draw', () => {
  it('draws the three dark circles in the "off" state', () => {
    const light = makeLight();
    const { ctx, calls } = mockCanvas2D();
    light.draw(ctx);
    // 3 dark light circles (off state adds no bright overlay)
    expect(calls.filter((c) => c.method === 'arc')).toHaveLength(3);
  });

  it('adds a bright overlay circle when green', () => {
    const light = makeLight();
    light.override('green');
    const { ctx, calls } = mockCanvas2D();
    light.draw(ctx);
    // 3 dark + 1 bright green overlay
    expect(calls.filter((c) => c.method === 'arc')).toHaveLength(4);
  });

  it('adds a bright overlay circle when red', () => {
    const light = makeLight();
    light.override('red');
    const { ctx, calls } = mockCanvas2D();
    light.draw(ctx);
    expect(calls.filter((c) => c.method === 'arc')).toHaveLength(4);
  });

  it('renders the cyan "M" badge when overridden', () => {
    const light = makeLight();
    light.override('yellow');
    const { ctx, calls } = mockCanvas2D();
    light.draw(ctx);
    const badge = calls.filter((c) => c.method === 'fillText');
    expect(badge).toHaveLength(1);
    expect(badge[0].args[0]).toBe('M');
  });

  it('does not render the badge when not overridden', () => {
    const light = makeLight();
    const { ctx, calls } = mockCanvas2D();
    light.draw(ctx);
    expect(calls.some((c) => c.method === 'fillText')).toBe(false);
  });
});
