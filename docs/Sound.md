# Sound System

The `ts/audio/sound.ts` module provides audio synthesis for game events using the Web Audio API. All sounds are generated programmatically — no audio files are loaded.

---

## Architecture

All sound functions are global (no class). They create a fresh `AudioContext` per invocation and connect oscillators and gain nodes to produce short sound effects.

```
┌─────────────────────────────────────┐
│ AudioContext                        │
│   └─ OscillatorNode (waveform)     │
│        └─ GainNode (volume envelope)│
│             └─ destination (speaker)│
└─────────────────────────────────────┘
```

---

## Available Sound Functions

### `beep(frequency, waveType?)`

Plays a simple tone for 0.4 seconds.

```typescript
function beep(frequency: number, waveType: OscillatorType = 'sine'): void;
```

**Parameters:**

- `frequency`: Pitch in Hz (e.g., 400 for a low beep, 600 for higher)
- `waveType`: Oscillator shape — `'sine'` (smooth), `'sawtooth'` (buzzy), `'square'` (retro), `'triangle'` (mellow)

**Volume envelope:**

```
Volume
  1 ┤     ╱──╲
    │    ╱    ╲
    │   ╱      ╲
  0 ┤──╱        ╲──
    └──┼──┼──┼──┼──→ Time
      0 0.1 0.2 0.4s
```

Ramps up quickly (0→1 in 0.1s), then ramps down to 0 over remaining 0.3s.

**Usage:** Countdown ticks in race mode, UI feedback.

---

### `taDaa()`

Plays a short victory fanfare (two ascending tones).

```typescript
function taDaa(): void;
```

**Implementation:**

```typescript
function taDaa(): void {
  beep(400, 'sawtooth'); // First note: low buzzy tone
  setTimeout(() => beep(600, 'sawtooth'), 200); // Second note: higher, 200ms later
}
```

**Timing:** Two sawtooth beeps 200ms apart, ascending pitch (400 Hz → 600 Hz).

**Usage:** Player finishes a race.

---

### `explode()`

Creates a multi-oscillator explosion/crash sound effect.

```typescript
function explode(): void;
```

**Implementation:**

```typescript
function explode(): void {
  const audioContext = new AudioContext();
  const numOscillators = 10;

  for (let i = 0; i < numOscillators; i++) {
    const osc = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    // Random frequency in low range (100-300 Hz) for rumble
    osc.frequency.setValueAtTime(100 + Math.random() * 200, currentTime);
    osc.connect(envelope);
    osc.start(currentTime);
    osc.stop(currentTime + 1); // 1 second duration

    // Volume: quick attack (0.1s), slow decay (0.9s)
    envelope.gain.setValueAtTime(0, currentTime);
    envelope.gain.linearRampToValueAtTime(1, currentTime + 0.1);
    envelope.gain.linearRampToValueAtTime(0, currentTime + 1);
    envelope.connect(audioContext.destination);
  }
}
```

**Characteristics:**

- 10 simultaneous oscillators with random frequencies (100-300 Hz)
- Creates a chaotic, noisy rumble effect
- Quick 0.1s attack, 0.9s decay
- Total duration: 1 second

**Usage:** Available for collision events (currently unused in main code, available for future use).

---

## Web Audio API Pattern

Each function follows the same pattern:

```typescript
function soundEffect(): void {
  // 1. Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // 2. Create oscillator (sound source)
  const osc = audioContext.createOscillator();
  osc.frequency.setValueAtTime(freq, audioContext.currentTime);
  osc.type = 'sine'; // or 'sawtooth', 'square', 'triangle'

  // 3. Create gain node (volume control)
  const envelope = audioContext.createGain();

  // 4. Connect: oscillator → gain → speakers
  osc.connect(envelope);
  envelope.connect(audioContext.destination);

  // 5. Schedule start/stop
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);

  // 6. Shape volume over time
  envelope.gain.setValueAtTime(0, audioContext.currentTime);
  envelope.gain.linearRampToValueAtTime(
    1,
    audioContext.currentTime + attackTime,
  );
  envelope.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
}
```

**Why fresh AudioContext per call?** Browser audio contexts have limits. For short one-shot sounds, creating and discarding contexts is simpler than maintaining a persistent one. The browser garbage-collects them after the oscillators stop.

---

## Usage in Race Mode

```typescript
// Countdown: beep at each second
startCounter(): void {
  counter.innerText = '3';
  beep(400);                    // Low beep
  setTimeout(() => {
    counter.innerText = '2';
    beep(400);
    setTimeout(() => {
      counter.innerText = '1';
      beep(400);
      setTimeout(() => {
        counter.innerText = 'GO!';
        beep(600);              // Higher pitch = GO!
        this.started = true;
      }, 1000);
    }, 1000);
  }, 1000);
}

// Victory: when player car reaches finish
updateCarProgress(car): void {
  if (car.progress >= 1 && car === this.myCar) {
    taDaa();  // Victory fanfare
  }
}
```

---

## Browser Compatibility

- Uses `window.AudioContext || window.webkitAudioContext` for Safari compatibility
- Web Audio API is supported in all modern browsers
- Some browsers require user interaction before playing audio (autoplay policy)
  - The race countdown starts from a user click (restart button), satisfying this requirement
