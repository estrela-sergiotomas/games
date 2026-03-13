/**
 * Generates 80s synthwave-style background music using Web Audio API.
 * No external audio files needed.
 */
export class SynthMusic {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];
  private intervalIds: number[] = [];
  private userWantsMusic = false;
  private visibilityBound = false;

  start(): void {
    if (this.isPlaying) return;
    this.userWantsMusic = true;

    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.15;
    this.gainNode.connect(this.ctx.destination);
    this.isPlaying = true;

    this.playBassline();
    this.playArpeggio();
    this.playPad();
    this.playDrums();

    if (!this.visibilityBound) {
      this.visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Tab hidden: pause music but keep game running
          if (this.isPlaying) this.stopInternal();
        } else {
          // Tab visible: resume if user wants music
          if (this.userWantsMusic && !this.isPlaying) this.start();
        }
      });
    }
  }

  stop(): void {
    this.userWantsMusic = false;
    this.stopInternal();
  }

  private stopInternal(): void {
    this.isPlaying = false;
    this.oscillators.forEach(o => { try { o.stop(); } catch {} });
    this.oscillators = [];
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
    this.ctx?.close();
    this.ctx = null;
  }

  setVolume(vol: number): void {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, vol));
  }

  private playNote(freq: number, duration: number, type: OscillatorType = 'sawtooth', volume = 0.3, detune = 0): void {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 5;

    env.gain.setValueAtTime(volume, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.gainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    this.oscillators.push(osc);
  }

  private playBassline(): void {
    // E minor pentatonic bass pattern
    const notes = [82.41, 98.0, 110.0, 123.47, 82.41, 110.0, 98.0, 82.41]; // E2, G2, A2, B2
    let i = 0;
    const id = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.playNote(notes[i % notes.length], 0.35, 'sawtooth', 0.4);
      i++;
    }, 375);
    this.intervalIds.push(id);
  }

  private playArpeggio(): void {
    // Synth arpeggio - Em chord tones
    const patterns = [
      [329.63, 392.0, 493.88, 659.25], // E4, G4, B4, E5
      [293.66, 349.23, 440.0, 587.33],  // D4, F4, A4, D5
      [261.63, 329.63, 392.0, 523.25],  // C4, E4, G4, C5
      [293.66, 349.23, 440.0, 587.33],  // D4, F4, A4, D5
    ];
    let bar = 0;
    let step = 0;
    const id = window.setInterval(() => {
      if (!this.isPlaying) return;
      const pattern = patterns[bar % patterns.length];
      this.playNote(pattern[step % pattern.length], 0.15, 'square', 0.12, 7);
      step++;
      if (step >= 16) { step = 0; bar++; }
    }, 187.5);
    this.intervalIds.push(id);
  }

  private playPad(): void {
    if (!this.ctx || !this.gainNode) return;

    // Sustained pad chord
    const chords = [
      [164.81, 196.0, 246.94], // E3, G3, B3
      [146.83, 174.61, 220.0], // D3, F3, A3
      [130.81, 164.81, 196.0], // C3, E3, G3
      [146.83, 174.61, 220.0], // D3, F3, A3
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      const chord = chords[chordIdx % chords.length];
      chord.forEach(freq => {
        this.playNote(freq, 2.8, 'sine', 0.08, 3);
        this.playNote(freq * 1.002, 2.8, 'sine', 0.06, -3); // slight detune for width
      });
      chordIdx++;
    };

    playChord();
    const id = window.setInterval(playChord, 3000);
    this.intervalIds.push(id);
  }

  private playDrums(): void {
    if (!this.ctx || !this.gainNode) return;

    let beat = 0;
    const id = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;

      // Kick on 1 and 3
      if (beat % 4 === 0 || beat % 4 === 2) {
        const kick = this.ctx.createOscillator();
        const kickEnv = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, this.ctx.currentTime);
        kick.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        kickEnv.gain.setValueAtTime(0.5, this.ctx.currentTime);
        kickEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        kick.connect(kickEnv);
        kickEnv.connect(this.gainNode);
        kick.start();
        kick.stop(this.ctx.currentTime + 0.15);
        this.oscillators.push(kick);
      }

      // Snare on 2 and 4
      if (beat % 4 === 1 || beat % 4 === 3) {
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        noise.buffer = buffer;
        const snareEnv = this.ctx.createGain();
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.value = 3000;
        snareEnv.gain.setValueAtTime(0.3, this.ctx.currentTime);
        snareEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        noise.connect(snareFilter);
        snareFilter.connect(snareEnv);
        snareEnv.connect(this.gainNode);
        noise.start();
      }

      // Hi-hat on every beat
      const hat = this.ctx.createBufferSource();
      const hatSize = this.ctx.sampleRate * 0.03;
      const hatBuffer = this.ctx.createBuffer(1, hatSize, this.ctx.sampleRate);
      const hatData = hatBuffer.getChannelData(0);
      for (let i = 0; i < hatSize; i++) hatData[i] = (Math.random() * 2 - 1) * 0.1;
      hat.buffer = hatBuffer;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.value = 8000;
      const hatEnv = this.ctx.createGain();
      hatEnv.gain.setValueAtTime(0.15, this.ctx.currentTime);
      hatEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
      hat.connect(hatFilter);
      hatFilter.connect(hatEnv);
      hatEnv.connect(this.gainNode);
      hat.start();

      beat++;
    }, 187.5);
    this.intervalIds.push(id);
  }
}

export const synthMusic = new SynthMusic();
