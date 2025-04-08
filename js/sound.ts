/**
 * Plays a short "ta-daa" sound effect.
 */
function taDaa(): void {
  beep(400, 'sawtooth');
  setTimeout(() => beep(600, 'sawtooth'), 200);
}

/**
 * Creates a multi-oscillator explosion sound effect.
 */
function explode(): void {
  const audioContext: AudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const numOscillators: number = 10;

  for (let i = 0; i < numOscillators; i++) {
    const osc: OscillatorNode = audioContext.createOscillator();
    const envelope: GainNode = audioContext.createGain();
    const currentTime = audioContext.currentTime;

    // Set random initial frequency
    osc.frequency.setValueAtTime(100 + Math.random() * 200, currentTime);
    osc.connect(envelope);
    osc.start(currentTime);
    // Stop after 1 second
    osc.stop(currentTime + 1);

    // Volume envelope: quick ramp up, slow ramp down
    envelope.gain.setValueAtTime(0, currentTime); // Start at 0 volume
    envelope.gain.linearRampToValueAtTime(1, currentTime + 0.1); // Ramp up to 1 in 0.1s
    envelope.gain.linearRampToValueAtTime(0, currentTime + 1); // Ramp down to 0 over 1s
    envelope.connect(audioContext.destination);
  }
}

/**
 * Plays a simple beep sound.
 * @param frequency - The frequency of the beep in Hz.
 * @param waveType - The oscillator waveform type. Defaults to 'sine'.
 */
function beep(frequency: number, waveType: OscillatorType = 'sine'): void {
  const audioContext: AudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const osc: OscillatorNode = audioContext.createOscillator();
  const envelope: GainNode = audioContext.createGain();
  const currentTime = audioContext.currentTime;
  const duration = 0.4; // Duration of the beep in seconds

  osc.frequency.setValueAtTime(frequency, currentTime);
  osc.type = waveType;
  osc.connect(envelope);
  osc.start(currentTime);
  // Stop after duration
  osc.stop(currentTime + duration);

  // Volume envelope: ramp up, then ramp down
  envelope.gain.setValueAtTime(0, currentTime);
  envelope.gain.linearRampToValueAtTime(1, currentTime + 0.1); // Ramp up in 0.1s
  envelope.gain.linearRampToValueAtTime(0, currentTime + duration); // Ramp down over the full duration
  envelope.connect(audioContext.destination);
}

/**
 * Represents a simple engine sound synthesizer.
 */
class Engine {
  private audioContext: AudioContext;
  private osc: OscillatorNode;
  private masterGain: GainNode;
  private lfo: OscillatorNode;
  private mod: GainNode;

  // Public accessors for controlling parameters
  public volume: AudioParam;
  public frequency: AudioParam;

  constructor() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const currentTime = this.audioContext.currentTime;

    this.osc = this.audioContext.createOscillator();
    this.masterGain = this.audioContext.createGain();

    // Base engine tone frequency
    this.osc.frequency.setValueAtTime(200, currentTime);
    this.osc.connect(this.masterGain);
    this.osc.start(currentTime);

    // Master volume control
    this.masterGain.gain.setValueAtTime(0.2, currentTime); // Default volume
    this.masterGain.connect(this.audioContext.destination);

    // Low-Frequency Oscillator (LFO) for frequency modulation ("rumble")
    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.setValueAtTime(30, currentTime); // LFO speed
    this.mod = this.audioContext.createGain();
    this.mod.gain.setValueAtTime(60, currentTime); // LFO intensity (modulation depth)
    this.lfo.connect(this.mod);
    this.mod.connect(this.osc.frequency); // Modulate the main oscillator's frequency
    this.lfo.start(currentTime);

    // Expose control parameters
    this.volume = this.masterGain.gain;
    this.frequency = this.osc.frequency;
  }

  /**
   * Sets the engine volume.
   * @param percent - Volume level (0 to 1, typically).
   */
  setVolume(percent: number): void {
    // Use setValueAtTime for sample-accurate changes if needed, though direct value assignment is often fine for gain.
    // this.volume.setValueAtTime(percent, this.audioContext.currentTime);
    // Ensure value is clamped if necessary
    this.volume.value = Math.max(0, Math.min(1, percent));
  }

  /**
   * Sets the base pitch of the engine sound.
   * @param percent - Pitch level, mapped to a frequency range.
   */
  setPitch(percent: number): void {
    // Map percent (0 to 1) to a frequency range (e.g., 100Hz to 300Hz)
    const targetFrequency = percent * 200 + 100;
    // Use setValueAtTime for smooth transitions if required, or target approaches
    this.frequency.setValueAtTime(
      targetFrequency,
      this.audioContext.currentTime,
    );
    // For smoother changes:
    // this.frequency.linearRampToValueAtTime(targetFrequency, this.audioContext.currentTime + 0.05); // 50ms ramp
  }

  /**
   * Stops the engine sound and releases audio resources.
   */
  stop(): void {
    const currentTime = this.audioContext.currentTime;
    this.masterGain.gain.cancelScheduledValues(currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0, currentTime + 0.1); // Fade out
    this.osc.stop(currentTime + 0.1);
    this.lfo.stop(currentTime + 0.1);
    // Consider closing the context after a delay if no other sounds are playing
    // setTimeout(() => this.audioContext.close(), 500);
  }
}
