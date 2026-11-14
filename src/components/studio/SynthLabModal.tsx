import React, { useState } from 'react';
import { Sound, DEFAULT_SYNTH_CONFIG } from '../../core/audio/SoundEngine';
import type { WaveformType, SynthConfig } from '../../core/audio/SoundEngine';
import { X, Volume2, RotateCcw, Play } from 'lucide-react';

interface SynthLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SynthLabModal: React.FC<SynthLabModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SynthConfig>({ ...Sound.config });

  if (!isOpen) return null;

  const handleUpdate = (field: keyof SynthConfig, value: any) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    Sound.config = updated;
  };

  const handleTestNote = () => {
    Sound.init();
    Sound.playBounceNote(1.2);
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_SYNTH_CONFIG });
    Sound.config = { ...DEFAULT_SYNTH_CONFIG };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="paper-card bg-indigo-50 w-full max-w-lg max-h-[90vh] flex flex-col p-4 shadow-[8px_10px_0px_#0f172a]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-700" />
            <span className="text-base sm:text-lg font-black text-slate-900">
              Audio Synthesizer Lab
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs font-bold text-slate-800">
          <p className="text-slate-600 font-medium">
            Fine-tune the real-time Web Audio API procedural arpeggio piano bounce timbre, musical scales, decay times, and synthesizer harmonics.
          </p>

          {/* Arpeggio Scale Selector */}
          <div className="paper-card bg-white p-3 space-y-2">
            <span className="text-xs font-black uppercase text-indigo-950">1. Musical Arpeggio Scale</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(['ragtime', 'pentatonic', 'major', 'minor'] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => handleUpdate('scaleType', sc)}
                  className={`paper-btn text-xs py-1.5 capitalize font-black ${
                    config.scaleType === sc ? 'bg-indigo-400 text-white' : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          {/* Waveforms */}
          <div className="paper-card bg-white p-3 space-y-2">
            <span className="text-xs font-black uppercase text-indigo-950">2. Oscillator Timbre (Primary & Overtone)</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-[11px] text-slate-600 font-extrabold">Primary Waveform</label>
                <select
                  value={config.waveform}
                  onChange={(e) => handleUpdate('waveform', e.target.value as WaveformType)}
                  className="paper-btn w-full bg-white text-xs px-2 py-1"
                >
                  <option value="triangle">Triangle (Warm Piano)</option>
                  <option value="sine">Sine (Pure Mellow)</option>
                  <option value="sawtooth">Sawtooth (Buzzy Synth)</option>
                  <option value="square">Square (8-Bit Arcade)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-[11px] text-slate-600 font-extrabold">Overtone Harmonics</label>
                <select
                  value={config.secondaryWaveform}
                  onChange={(e) => handleUpdate('secondaryWaveform', e.target.value as WaveformType)}
                  className="paper-btn w-full bg-white text-xs px-2 py-1"
                >
                  <option value="sine">Sine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="square">Square</option>
                </select>
              </div>
            </div>
          </div>

          {/* Decay & Volume Sliders */}
          <div className="paper-card bg-white p-3 space-y-3">
            <span className="text-xs font-black uppercase text-indigo-950">3. Dynamics & Envelope</span>

            <div>
              <div className="flex justify-between mb-1">
                <span>Note Decay Time</span>
                <span className="mono-num">{config.decayTime.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.08"
                max="0.6"
                step="0.02"
                value={config.decayTime}
                onChange={(e) => handleUpdate('decayTime', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Master Synthesizer Gain</span>
                <span className="mono-num">{Math.round(config.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.volume}
                onChange={(e) => handleUpdate('volume', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="paper-btn bg-slate-200 hover:bg-slate-300 text-xs px-2.5 py-1.5 flex items-center gap-1 font-bold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestNote}
              className="paper-btn bg-amber-300 hover:bg-amber-200 text-slate-900 text-xs px-3 py-1.5 flex items-center gap-1 font-black"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Note</span>
            </button>
            <button
              onClick={onClose}
              className="paper-btn bg-indigo-500 hover:bg-indigo-400 text-white text-xs px-4 py-1.5 font-black"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
