function beep(frequency) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();

  oscillator.frequency.setValueAtTime(frequency, 0);
  oscillator.connect(envelope);
  oscillator.start();
  oscillator.stop(0.4);

  envelope.gain.value = 0;
  envelope.gain.linearRampToValueAtTime(1, 0.1);
  envelope.gain.linearRampToValueAtTime(0, 0.4);

  envelope.connect(audioContext.destination);
  envelope.connect(audioContext.destination);
}

class Engine {
  constructor() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const masterGain = audioContext.createGain();

    oscillator.frequency.setValueAtTime(200, 0);
    oscillator.connect(masterGain);
    oscillator.start();

    masterGain.gain.value = 0.2;

    masterGain.connect(audioContext.destination);
    masterGain.connect(audioContext.destination);

    const lowFrequencyOscillator = audioContext.createOscillator();
    lowFrequencyOscillator.frequency.setValueAtTime(30, 0);
    const mod = audioContext.createGain();
    mod.gain.value = 60;
    lowFrequencyOscillator.connect(mod);
    mod.connect(oscillator.frequency);
    lowFrequencyOscillator.start();

    this.volume = masterGain.gain;
    this.frequency = oscillator.frequency;
  }

  setVolume(percent) {
    this.volume.value = percent;
  }

  setPitch(percent) {
    this.frequency.setValueAtTime(percent * 200 + 100, 0);
  }
}
