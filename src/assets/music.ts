/**
 * Mortal Kombat-style aggressive techno background music using Web Audio API.
 * 140 BPM, E minor, heavy bass, distorted synth riffs, hard-hitting drums.
 * No external audio files needed.
 */
export class SynthMusic {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];
  private intervalIds: number[] = [];

  start(): void {
    if (this.isPlaying) return;

    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.18;
    this.gainNode.connect(this.ctx.destination);
    this.isPlaying = true;

    this.playBassRiff();
    this.playSynthLead();
    this.playPowerPad();
    this.playDrums();
  }

  stop(): void {
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

  private makeDistortion(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  private playDistortedNote(freq: number, duration: number, type: OscillatorType = 'sawtooth', volume = 0.3, detune = 0): void {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const distortion = this.ctx.createWaveShaper();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    (distortion as any).curve = this.makeDistortion(20);
    distortion.oversample = '4x';

    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 8;

    env.gain.setValueAtTime(volume, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(distortion);
    distortion.connect(filter);
    filter.connect(env);
    env.connect(this.gainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    this.oscillators.push(osc);
  }

  private playCleanNote(freq: number, duration: number, type: OscillatorType = 'sawtooth', volume = 0.3, detune = 0): void {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    filter.Q.value = 4;

    env.gain.setValueAtTime(volume, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.gainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    this.oscillators.push(osc);
  }

  private playBassRiff(): void {
    // Aggressive distorted bass riff in E minor - MK style power notes
    // E2, E2, G2, A2, E2, B1, E2, D2 - staccato and punchy
    const notes = [82.41, 82.41, 98.0, 110.0, 82.41, 61.74, 82.41, 73.42];
    const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.2, 0.15, 0.2];
    let i = 0;
    // 140 BPM = 428ms per beat, 16th notes = ~107ms
    const id = window.setInterval(() => {
      if (!this.isPlaying) return;
      const idx = i % notes.length;
      this.playDistortedNote(notes[idx], durations[idx], 'sawtooth', 0.5);
      // Sub-bass layer
      this.playCleanNote(notes[idx] / 2, durations[idx] + 0.05, 'sine', 0.35);
      i++;
    }, 214); // 8th notes at 140 BPM
    this.intervalIds.push(id);
  }

  private playSynthLead(): void {
    // Staccato square wave synth stabs - like MK theme melody
    // Uses power fifths and minor scale runs
    const patterns = [
      // Pattern 1: E minor power stabs
      [329.63, 0, 329.63, 0, 392.0, 0, 440.0, 493.88,
       329.63, 0, 329.63, 0, 293.66, 0, 329.63, 0],
      // Pattern 2: Descending aggression
      [659.25, 0, 587.33, 0, 493.88, 0, 440.0, 0,
       392.0, 0, 329.63, 0, 293.66, 329.63, 0, 0],
      // Pattern 3: Rapid fire stabs
      [329.63, 329.63, 0, 329.63, 392.0, 440.0, 0, 493.88,
       329.63, 0, 659.25, 0, 587.33, 493.88, 440.0, 392.0],
      // Pattern 4: Power chord hits
      [329.63, 0, 0, 0, 440.0, 0, 0, 0,
       392.0, 0, 0, 0, 329.63, 0, 293.66, 329.63],
    ];
    let bar = 0;
    let step = 0;
    const id = window.setInterval(() => {
      if (!this.isPlaying) return;
      const pattern = patterns[bar % patterns.length];
      const freq = pattern[step % pattern.length];
      if (freq > 0) {
        this.playDistortedNote(freq, 0.08, 'square', 0.15, 5);
        // Octave doubling for thickness
        this.playCleanNote(freq * 2, 0.06, 'square', 0.06, -5);
      }
      step++;
      if (step >= 16) { step = 0; bar++; }
    }, 107); // 16th notes at 140 BPM
    this.intervalIds.push(id);
  }

  private playPowerPad(): void {
    if (!this.ctx || !this.gainNode) return;

    // Dark ambient power chords - detuned sawtooth for aggression
    const chords = [
      [82.41, 123.47, 164.81],   // E2, B2, E3 - power fifth
      [73.42, 110.0, 146.83],    // D2, A2, D3
      [65.41, 98.0, 130.81],     // C2, G2, C3
      [73.42, 110.0, 146.83],    // D2, A2, D3
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      const chord = chords[chordIdx % chords.length];
      chord.forEach(freq => {
        this.playDistortedNote(freq, 1.6, 'sawtooth', 0.06, 7);
        this.playDistortedNote(freq * 1.005, 1.6, 'sawtooth', 0.04, -7);
      });
      chordIdx++;
    };

    playChord();
    const id = window.setInterval(playChord, 1714); // 4 beats at 140 BPM
    this.intervalIds.push(id);
  }

  private playDrums(): void {
    if (!this.ctx || !this.gainNode) return;

    let beat = 0;
    // 140 BPM, 16th notes = ~107ms
    const id = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;

      // HEAVY kick on 1, 3, and syncopated hits
      if (beat % 8 === 0 || beat % 8 === 4 || beat % 8 === 6) {
        // Main kick - deep and punchy
        const kick = this.ctx.createOscillator();
        const kickEnv = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(200, this.ctx.currentTime);
        kick.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
        kickEnv.gain.setValueAtTime(0.7, this.ctx.currentTime);
        kickEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        kick.connect(kickEnv);
        kickEnv.connect(this.gainNode);
        kick.start();
        kick.stop(this.ctx.currentTime + 0.2);
        this.oscillators.push(kick);

        // Sub-bass thump layer
        const sub = this.ctx.createOscillator();
        const subEnv = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.value = 45;
        subEnv.gain.setValueAtTime(0.4, this.ctx.currentTime);
        subEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        sub.connect(subEnv);
        subEnv.connect(this.gainNode);
        sub.start();
        sub.stop(this.ctx.currentTime + 0.15);
        this.oscillators.push(sub);
      }

      // Hard snare on 2 and 4 (beats 4 and 12 in 16th note grid)
      if (beat % 8 === 2 || beat % 8 === 6) {
        // Snare body
        const snareOsc = this.ctx.createOscillator();
        const snareOscEnv = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(250, this.ctx.currentTime);
        snareOsc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.05);
        snareOscEnv.gain.setValueAtTime(0.4, this.ctx.currentTime);
        snareOscEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        snareOsc.connect(snareOscEnv);
        snareOscEnv.connect(this.gainNode);
        snareOsc.start();
        snareOsc.stop(this.ctx.currentTime + 0.08);
        this.oscillators.push(snareOsc);

        // Snare noise - louder and longer for impact
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        noise.buffer = buffer;
        const snareEnv = this.ctx.createGain();
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.value = 2500;
        snareEnv.gain.setValueAtTime(0.45, this.ctx.currentTime);
        snareEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        noise.connect(snareFilter);
        snareFilter.connect(snareEnv);
        snareEnv.connect(this.gainNode);
        noise.start();
      }

      // Hi-hat pattern - every 16th note with accents
      const hatVol = (beat % 4 === 0) ? 0.2 : (beat % 2 === 0) ? 0.12 : 0.06;
      const hatLen = (beat % 4 === 0) ? 0.06 : 0.025; // open accent on downbeats
      const hat = this.ctx.createBufferSource();
      const hatSize = Math.floor(this.ctx.sampleRate * hatLen);
      const hatBuffer = this.ctx.createBuffer(1, hatSize, this.ctx.sampleRate);
      const hatData = hatBuffer.getChannelData(0);
      for (let i = 0; i < hatSize; i++) hatData[i] = (Math.random() * 2 - 1) * hatVol;
      hat.buffer = hatBuffer;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.value = 9000;
      const hatEnv = this.ctx.createGain();
      hatEnv.gain.setValueAtTime(hatVol, this.ctx.currentTime);
      hatEnv.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + hatLen);
      hat.connect(hatFilter);
      hatFilter.connect(hatEnv);
      hatEnv.connect(this.gainNode);
      hat.start();

      beat++;
    }, 107); // 16th notes at 140 BPM
    this.intervalIds.push(id);
  }
}

export const synthMusic = new SynthMusic();
