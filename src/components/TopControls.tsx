import React, { useState } from 'react';
import type { RaceSimulation } from '../simulation/RaceSimulation';
import { Sound } from '../core/audio/SoundEngine';
import { RotateCcw, Pause, Play, Volume2, VolumeX, Sliders, MapPin, Users } from 'lucide-react';

interface TopControlsProps {
  simulation: RaceSimulation;
  onOpenMapEditor: () => void;
  onOpenSynthLab: () => void;
  onOpenRacerStudio: () => void;
}

export const TopControls: React.FC<TopControlsProps> = ({
  simulation,
  onOpenMapEditor,
  onOpenSynthLab,
  onOpenRacerStudio,
}) => {
  const [mapKey, setMapKey] = useState(simulation.currentMapKey);
  const [paused, setPaused] = useState(simulation.paused);
  const [speed, setSpeed] = useState(simulation.speedMultiplier);
  const [audioEnabled, setAudioEnabled] = useState(Sound.enabled);

  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    Sound.init();
    const newKey = e.target.value;
    setMapKey(newKey);
    simulation.loadRace(newKey);
  };

  const handleRestart = () => {
    Sound.init();
    simulation.loadRace(simulation.currentMapKey);
  };

  const handleTogglePause = () => {
    Sound.init();
    const nextPaused = !simulation.paused;
    simulation.paused = nextPaused;
    setPaused(nextPaused);
  };

  const handleCycleSpeed = () => {
    Sound.init();
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const curIdx = speeds.indexOf(simulation.speedMultiplier);
    const nextIdx = (curIdx + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    simulation.speedMultiplier = nextSpeed;
    setSpeed(nextSpeed);
  };

  const handleToggleAudio = () => {
    Sound.init();
    Sound.enabled = !Sound.enabled;
    setAudioEnabled(Sound.enabled);
  };

  return (
    <header className="z-20 w-full max-w-4xl px-2 pt-2 flex flex-wrap items-center justify-between gap-1.5">
      {/* Brand & Map Selector */}
      <div className="flex items-center gap-1.5 bg-amber-100 paper-card px-2.5 py-1">
        <div className="w-5 h-5 bg-red-500 border-2 border-slate-900 rounded-sm relative flex items-center justify-center shadow-sm">
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 bg-white border border-black"></div>
            <div className="w-1.5 h-1.5 bg-white border border-black"></div>
          </div>
        </div>
        <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight mr-1">
          Minit Escape!
        </span>
        <select
          value={mapKey}
          onChange={handleMapChange}
          className="paper-btn bg-white text-slate-900 text-xs px-2 py-0.5 focus:outline-none"
        >
          <option value="classic_serpentine">Map 1: Viral Serpentine</option>
          <option value="double_helix">Map 2: Twin Chute Chaos</option>
          <option value="arena_gauntlet">Map 3: Zig-Zag Gauntlet</option>
          {simulation.currentMapKey.startsWith('custom_') && (
            <option value={simulation.currentMapKey}>★ Custom User Map</option>
          )}
        </select>
      </div>

      {/* Playback & Speed Controls */}
      <div className="flex items-center gap-1 bg-white/95 paper-card px-2 py-1">
        <button
          onClick={handleRestart}
          className="paper-btn bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-xs px-2 py-1 flex items-center gap-1"
          title="Restart Current Race"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Restart</span>
        </button>

        <button
          onClick={handleTogglePause}
          className="paper-btn bg-amber-300 hover:bg-amber-200 text-slate-900 text-xs px-2 py-1 flex items-center gap-1"
        >
          {paused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </>
          )}
        </button>

        <button
          onClick={handleCycleSpeed}
          className="paper-btn bg-sky-300 hover:bg-sky-200 text-slate-900 text-xs px-2 py-1 mono-num"
          title="Cycle Speed (0.5x, 1.0x, 1.5x, 2.0x)"
        >
          {speed.toFixed(1)}x
        </button>

        <button
          onClick={handleToggleAudio}
          className="paper-btn bg-rose-300 hover:bg-rose-200 text-slate-900 text-xs px-2 py-1 flex items-center gap-1"
          title="Toggle Procedural Piano Chimes & SFX"
        >
          {audioEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">SFX: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">SFX: OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Creative Studio Lab Modals */}
      <div className="flex items-center gap-1 bg-amber-50 paper-card px-2 py-1">
        <button
          onClick={onOpenMapEditor}
          className="paper-btn bg-emerald-100 hover:bg-emerald-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Open Custom Track Builder"
        >
          <MapPin className="w-3 h-3 stroke-[2.5] text-emerald-700" />
          <span>Track Builder</span>
        </button>

        <button
          onClick={onOpenSynthLab}
          className="paper-btn bg-indigo-100 hover:bg-indigo-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Open Procedural Web Audio Synth Controls"
        >
          <Sliders className="w-3 h-3 stroke-[2.5] text-indigo-700" />
          <span>Synth Lab</span>
        </button>

        <button
          onClick={onOpenRacerStudio}
          className="paper-btn bg-rose-100 hover:bg-rose-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Custom Racer Editor (Colors & Stats)"
        >
          <Users className="w-3 h-3 stroke-[2.5] text-rose-700" />
          <span>Roster</span>
        </button>
      </div>
    </header>
  );
};
