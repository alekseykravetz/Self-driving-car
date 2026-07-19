import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { beep, explode, taDaa, SoundEngine } from '../../../ts/audio/sound.js';

function createMockAudioContext() {
  const oscillator = () => ({
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    type: 'sine',
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  });
  const gain = () => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  return {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(oscillator),
    createGain: vi.fn(gain),
    close: vi.fn(),
  };
}

let mockContext: ReturnType<typeof createMockAudioContext>;
let AudioContextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  mockContext = createMockAudioContext();
  AudioContextMock = vi.fn(function () {
    return mockContext;
  });
  vi.stubGlobal('AudioContext', AudioContextMock);
  (globalThis as Record<string, unknown>).window = {
    AudioContext: AudioContextMock,
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis as Record<string, unknown>).window;
});

describe('beep', () => {
  it('creates AudioContext', () => {
    beep(440);
    expect(AudioContextMock).toHaveBeenCalled();
  });

  it('creates oscillator with correct frequency', () => {
    beep(440);
    const osc = mockContext.createOscillator.mock.results[0].value;
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
  });

  it('uses sine waveform by default', () => {
    beep(440);
    const osc = mockContext.createOscillator.mock.results[0].value;
    expect(osc.type).toBe('sine');
  });

  it('uses specified waveType', () => {
    beep(440, 'sawtooth');
    const osc = mockContext.createOscillator.mock.results[0].value;
    expect(osc.type).toBe('sawtooth');
  });

  it('connects oscillator to gain', () => {
    beep(440);
    const osc = mockContext.createOscillator.mock.results[0].value;
    const env = mockContext.createGain.mock.results[0].value;
    expect(osc.connect).toHaveBeenCalledWith(env);
  });

  it('connects gain to destination', () => {
    beep(440);
    const env = mockContext.createGain.mock.results[0].value;
    expect(env.connect).toHaveBeenCalledWith(mockContext.destination);
  });

  it('schedules gain envelope', () => {
    beep(440);
    const env = mockContext.createGain.mock.results[0].value;
    expect(env.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 0.1);
    expect(env.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.4);
  });

  it('starts and stops oscillator', () => {
    beep(440);
    const osc = mockContext.createOscillator.mock.results[0].value;
    expect(osc.start).toHaveBeenCalledWith(0);
    expect(osc.stop).toHaveBeenCalledWith(0.4);
  });
});

describe('explode', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('creates AudioContext', () => {
    explode();
    expect(AudioContextMock).toHaveBeenCalled();
  });

  it('creates 10 oscillators', () => {
    explode();
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(10);
  });

  it('each oscillator has random frequency (100 + rand*200)', () => {
    explode();
    for (let i = 0; i < 10; i++) {
      const osc = mockContext.createOscillator.mock.results[i].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(200, 0);
    }
  });

  it('connects each oscillator to its gain envelope', () => {
    explode();
    for (let i = 0; i < 10; i++) {
      const osc = mockContext.createOscillator.mock.results[i].value;
      const env = mockContext.createGain.mock.results[i].value;
      expect(osc.connect).toHaveBeenCalledWith(env);
    }
  });

  it('connects each gain to destination', () => {
    explode();
    for (let i = 0; i < 10; i++) {
      const env = mockContext.createGain.mock.results[i].value;
      expect(env.connect).toHaveBeenCalledWith(mockContext.destination);
    }
  });

  it('schedules gain envelope for each', () => {
    explode();
    for (let i = 0; i < 10; i++) {
      const env = mockContext.createGain.mock.results[i].value;
      expect(env.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
      expect(env.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 0.1);
      expect(env.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1);
    }
  });

  it('starts and stops each oscillator', () => {
    explode();
    for (let i = 0; i < 10; i++) {
      const osc = mockContext.createOscillator.mock.results[i].value;
      expect(osc.start).toHaveBeenCalledWith(0);
      expect(osc.stop).toHaveBeenCalledWith(1);
    }
  });
});

describe('taDaa', () => {
  it('calls beep with 400Hz sawtooth', () => {
    taDaa();
    const osc = mockContext.createOscillator.mock.results[0].value;
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(400, 0);
    expect(osc.type).toBe('sawtooth');
  });

  it('calls beep a second time with 600Hz sawtooth after timeout', () => {
    taDaa();
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(2);
    const osc = mockContext.createOscillator.mock.results[1].value;
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(600, 0);
    expect(osc.type).toBe('sawtooth');
  });
});

describe('SoundEngine', () => {
  describe('constructor', () => {
    it('creates AudioContext', () => {
      new SoundEngine();
      expect(AudioContextMock).toHaveBeenCalled();
    });

    it('creates main oscillator at 200Hz', () => {
      new SoundEngine();
      const osc = mockContext.createOscillator.mock.results[0].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(200, 0);
    });

    it('creates LFO oscillator at 30Hz', () => {
      new SoundEngine();
      const lfo = mockContext.createOscillator.mock.results[1].value;
      expect(lfo.frequency.setValueAtTime).toHaveBeenCalledWith(30, 0);
    });

    it('master gain defaults to 0.2', () => {
      new SoundEngine();
      const masterGain = mockContext.createGain.mock.results[0].value;
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 0);
    });

    it('exposes volume and frequency params', () => {
      const engine = new SoundEngine();
      expect(engine.volume).toBe(
        mockContext.createGain.mock.results[0].value.gain,
      );
      expect(engine.frequency).toBe(
        mockContext.createOscillator.mock.results[0].value.frequency,
      );
    });
  });

  describe('setVolume', () => {
    it('sets gain value', () => {
      const engine = new SoundEngine();
      engine.setVolume(0.7);
      expect(engine.volume.value).toBe(0.7);
    });

    it('clamps to [0, 1]', () => {
      const engine = new SoundEngine();
      engine.setVolume(-0.5);
      expect(engine.volume.value).toBe(0);
      engine.setVolume(1.5);
      expect(engine.volume.value).toBe(1);
    });
  });

  describe('setPitch', () => {
    it('maps 0 -> 100Hz', () => {
      const engine = new SoundEngine();
      engine.setPitch(0);
      expect(engine.frequency.setValueAtTime).toHaveBeenCalledWith(100, 0);
    });

    it('maps 0.5 -> 200Hz', () => {
      const engine = new SoundEngine();
      engine.setPitch(0.5);
      expect(engine.frequency.setValueAtTime).toHaveBeenCalledWith(200, 0);
    });

    it('maps 1 -> 300Hz', () => {
      const engine = new SoundEngine();
      engine.setPitch(1);
      expect(engine.frequency.setValueAtTime).toHaveBeenCalledWith(300, 0);
    });
  });

  describe('stop', () => {
    it('fades out master gain over 0.1s', () => {
      const engine = new SoundEngine();
      engine.stop();
      const masterGain = mockContext.createGain.mock.results[0].value;
      expect(masterGain.gain.cancelScheduledValues).toHaveBeenCalledWith(0);
      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0,
        0.1,
      );
    });

    it('stops main oscillator', () => {
      const engine = new SoundEngine();
      engine.stop();
      const osc = mockContext.createOscillator.mock.results[0].value;
      expect(osc.stop).toHaveBeenCalledWith(0.1);
    });

    it('stops LFO', () => {
      const engine = new SoundEngine();
      engine.stop();
      const lfo = mockContext.createOscillator.mock.results[1].value;
      expect(lfo.stop).toHaveBeenCalledWith(0.1);
    });
  });
});
