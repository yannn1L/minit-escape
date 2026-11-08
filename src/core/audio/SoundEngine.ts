import { GlobalRegistry } from '../registry/StrategyRegistry';

export type WaveformType = 'triangle' | 'sine' | 'sawtooth' | 'square';

export interface SynthConfig {
  waveform: WaveformType;
  secondaryWaveform: WaveformType;
  scaleType: 'ragtime' | 'pentatonic' | 'major' | 'minor';
  baseMidi: number;
  tempoMultiplier: number;
  decayTime: number;
  volume: number;
}

export const DEFAULT_SYNTH_CONFIG: SynthConfig = {
  waveform: 'triangle',
  secondaryWaveform: 'sine',
  scaleType: 'ragtime',
  baseMidi: 68,
  tempoMultiplier: 1.0,
  decayTime: 0.22,
  volume: 0.8,
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public noteIndex = 0;
  private lastBounceTime = 0;
  public config: SynthConfig = { ...DEFAULT_SYNTH_CONFIG };

  // Ragtime arpeggios sequence inspired by viral video (C# minor / Ab major energetic sequence)
  private scales: Record<string, number[]> = {
    ragtime: [
      68, 72, 75, 80, 75, 72, 68, 72, 75, 80, 75, 72,
      69, 73, 76, 81, 76, 73, 69, 73, 76, 81, 76, 73,
      66, 70, 73, 78, 73, 70, 68, 72, 75, 80, 84, 80,
      75, 72, 75, 80, 84, 87, 84, 80, 75, 72, 68, 63
    ],
    pentatonic: [
      60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 81, 79, 76, 74, 72
    ],
    major: [
      60, 64, 67, 72, 76, 79, 84, 79, 76, 72, 67, 64
    ],
    minor: [
      60, 63, 67, 72, 75, 79, 84, 79, 75, 72, 67, 63
    ]
  };

  init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  play(strategyKey: string, payload: any = {}): void {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const strategy = GlobalRegistry.get<(ctx: AudioContext, engine: SoundEngine, payload: any) => void>(
      'audio',
      strategyKey
    );
    if (strategy) {
      strategy(this.ctx, this, payload);
    }
  }

  playBounceNote(intensity = 1.0): void {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (now - this.lastBounceTime < 0.04) return;
    this.lastBounceTime = now;

    const scale = this.scales[this.config.scaleType] || this.scales.ragtime;
    const midi = scale[this.noteIndex % scale.length];
    this.noteIndex++;
    const freq = this.midiToFreq(midi);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = this.config.waveform;
    osc2.type = this.config.secondaryWaveform;
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    const vol = Math.min(0.18, 0.09 * intensity * this.config.volume);
    const decay = this.config.decayTime;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + decay);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + decay + 0.02);
    osc2.stop(now + decay + 0.02);
  }

  resetNoteIndex(): void {
    this.noteIndex = 0;
  }
}

export const Sound = new SoundEngine();

// Register Audio Strategies
GlobalRegistry.register('audio', 'bounce_note', (_ctx: AudioContext, engine: SoundEngine, { intensity = 1.0 }: { intensity?: number } = {}) => {
  engine.playBounceNote(intensity);
});

GlobalRegistry.register('audio', 'gate_break', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.18;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(950, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28 * Sound.config.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
});

GlobalRegistry.register('audio', 'cherry_clone', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  [587.33, 880, 1174.66].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.045);
    gain.gain.setValueAtTime(0.14 * Sound.config.volume, now + idx * 0.045);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.045);
    osc.stop(now + idx * 0.045 + 0.17);
  });
});

GlobalRegistry.register('audio', 'knife_pickup', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1800, now + 0.09);
  gain.gain.setValueAtTime(0.12 * Sound.config.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.11);
});

GlobalRegistry.register('audio', 'knife_kill', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
  gain.gain.setValueAtTime(0.24 * Sound.config.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
});

GlobalRegistry.register('audio', 'flood_petrify', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(95, now + 0.18);
  gain.gain.setValueAtTime(0.18 * Sound.config.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
});

GlobalRegistry.register('audio', 'win_fanfare', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
  const times = [0, 0.1, 0.2, 0.3, 0.45, 0.58];
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now + times[i]);
    gain.gain.setValueAtTime(0.2 * Sound.config.volume, now + times[i]);
    gain.gain.exponentialRampToValueAtTime(0.001, now + times[i] + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + times[i]);
    osc.stop(now + times[i] + 0.3);
  });
});

GlobalRegistry.register('audio', 'button_click', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(720, now);
  osc.frequency.exponentialRampToValueAtTime(980, now + 0.045);
  gain.gain.setValueAtTime(0.1 * Sound.config.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.055);
});

GlobalRegistry.register('audio', 'game_over', (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const notes = [392.0, 369.99, 349.23, 311.13];
  const times = [0, 0.14, 0.28, 0.42];
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, now + times[i]);
    gain.gain.setValueAtTime(0.15 * Sound.config.volume, now + times[i]);
    gain.gain.exponentialRampToValueAtTime(0.001, now + times[i] + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + times[i]);
    osc.stop(now + times[i] + 0.28);
  });
});

