import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PointerGestures,
  type PointerGestureCallbacks,
  type PointerGestureOptions,
} from '../../../ts/input/pointerGestures.js';

type Handler = (e: unknown) => void;

interface Harness {
  gestures: PointerGestures;
  fire: (type: string, event: Partial<PointerEvent>) => void;
  cb: Record<keyof PointerGestureCallbacks, ReturnType<typeof vi.fn>>;
}

function makeHarness(options: PointerGestureOptions = {}): Harness {
  const listeners: Record<string, Handler[]> = {};
  const canvas = {
    addEventListener: (type: string, handler: Handler) => {
      (listeners[type] ??= []).push(handler);
    },
    removeEventListener: (type: string, handler: Handler) => {
      listeners[type] = (listeners[type] ?? []).filter((h) => h !== handler);
    },
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  } as unknown as HTMLCanvasElement;

  const cb = {
    onDragStart: vi.fn(),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
    onTap: vi.fn(),
    onPinch: vi.fn(),
    onTwoFingerPan: vi.fn(),
    onSecondaryTap: vi.fn(),
  };

  const gestures = new PointerGestures(canvas, cb, options);
  gestures.enable();

  const fire = (type: string, event: Partial<PointerEvent>) => {
    const e = { pointerType: 'touch', preventDefault: () => {}, ...event };
    for (const h of listeners[type] ?? []) h(e);
  };

  return { gestures, fire, cb };
}

function pointer(
  id: number,
  x: number,
  y: number,
  pointerType = 'touch',
): Partial<PointerEvent> {
  return {
    pointerId: id,
    offsetX: x,
    offsetY: y,
    pointerType,
  } as Partial<PointerEvent>;
}

describe('PointerGestures — single finger', () => {
  let h: Harness;
  beforeEach(() => {
    vi.useFakeTimers();
    h = makeHarness();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves a stationary press+release into a tap', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointerup', pointer(1, 100, 100));
    expect(h.cb.onTap).toHaveBeenCalledTimes(1);
    expect(h.cb.onTap.mock.calls[0][0]).toEqual({ x: 100, y: 100 });
    expect(h.cb.onDragStart).not.toHaveBeenCalled();
  });

  it('fires a long-press secondary tap after the hold threshold', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    vi.advanceTimersByTime(500);
    expect(h.cb.onSecondaryTap).toHaveBeenCalledTimes(1);
    // The trailing release must NOT also fire a tap.
    h.fire('pointerup', pointer(1, 100, 100));
    expect(h.cb.onTap).not.toHaveBeenCalled();
  });

  it('starts a drag once movement crosses the tolerance', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointermove', pointer(1, 120, 100));
    h.fire('pointermove', pointer(1, 140, 100));
    h.fire('pointerup', pointer(1, 140, 100));
    expect(h.cb.onDragStart).toHaveBeenCalledTimes(1);
    // Drag starts from the original press position.
    expect(h.cb.onDragStart.mock.calls[0][0]).toEqual({ x: 100, y: 100 });
    expect(h.cb.onDragMove).toHaveBeenCalled();
    expect(h.cb.onDragEnd).toHaveBeenCalledTimes(1);
    expect(h.cb.onTap).not.toHaveBeenCalled();
  });

  it('does not fire a long-press once a drag has begun', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointermove', pointer(1, 140, 100));
    vi.advanceTimersByTime(500);
    expect(h.cb.onSecondaryTap).not.toHaveBeenCalled();
  });
});

describe('PointerGestures — singleFingerDisabled gate', () => {
  let h: Harness;
  beforeEach(() => {
    vi.useFakeTimers();
    h = makeHarness({ singleFingerDisabled: () => true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('suppresses single-finger drag and tap', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointermove', pointer(1, 140, 100));
    h.fire('pointerup', pointer(1, 140, 100));
    expect(h.cb.onDragStart).not.toHaveBeenCalled();
    expect(h.cb.onTap).not.toHaveBeenCalled();
  });

  it('does not arm the long-press timer when gated', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    vi.advanceTimersByTime(500);
    expect(h.cb.onSecondaryTap).not.toHaveBeenCalled();
  });
});

describe('PointerGestures — two fingers', () => {
  let h: Harness;
  beforeEach(() => {
    vi.useFakeTimers();
    h = makeHarness();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits pinch scale and pan delta on two-finger move', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointerdown', pointer(2, 200, 100)); // dist=100, mid=(150,100)
    h.fire('pointermove', pointer(2, 300, 100)); // dist=200, mid=(200,100)
    expect(h.cb.onPinch).toHaveBeenCalled();
    const [scale] = h.cb.onPinch.mock.calls[0];
    expect(scale).toBeCloseTo(2, 5);
    expect(h.cb.onTwoFingerPan).toHaveBeenCalled();
    const [dx] = h.cb.onTwoFingerPan.mock.calls[0];
    expect(dx).toBeCloseTo(50, 5);
  });

  it('resolves a quick two-finger tap into a secondary tap', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointerdown', pointer(2, 200, 100));
    h.fire('pointerup', pointer(2, 200, 100));
    h.fire('pointerup', pointer(1, 100, 100));
    expect(h.cb.onSecondaryTap).toHaveBeenCalledTimes(1);
  });

  it('does not fire a single-finger tap for the leftover finger', () => {
    h.fire('pointerdown', pointer(1, 100, 100));
    h.fire('pointerdown', pointer(2, 200, 100));
    h.fire('pointermove', pointer(2, 300, 100)); // real pinch → moved
    h.fire('pointerup', pointer(2, 300, 100));
    h.fire('pointerup', pointer(1, 100, 100));
    expect(h.cb.onTap).not.toHaveBeenCalled();
  });
});

describe('PointerGestures — mouse ignored', () => {
  it('ignores mouse pointers entirely', () => {
    vi.useFakeTimers();
    const h = makeHarness();
    h.fire('pointerdown', pointer(1, 100, 100, 'mouse'));
    h.fire('pointerup', pointer(1, 100, 100, 'mouse'));
    expect(h.cb.onTap).not.toHaveBeenCalled();
    expect(h.cb.onDragStart).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
