import React from 'react';
import type { RaceSimulation } from '../simulation/RaceSimulation';
import { Sound } from '../core/audio/SoundEngine';
import { Zap, Copy, Sword, Star, Shield } from 'lucide-react';

interface SpawnerToolbarProps {
  simulation: RaceSimulation;
}

export const SpawnerToolbar: React.FC<SpawnerToolbarProps> = ({ simulation }) => {
  const handleSpawn = (type: string) => {
    Sound.init();
    const dropSpots = [
      { x: 210, y: 255 },
      { x: 310, y: 420 },
      { x: 428, y: 360 },
      { x: 105, y: 240 }
    ];
    const spot = dropSpots[Math.floor(Math.random() * dropSpots.length)];
    const rx = spot.x + (Math.random() - 0.5) * 24;
    const ry = spot.y + (Math.random() - 0.5) * 24;
    simulation.spawnPickup(type, rx, ry, 0.05);
    simulation.spawnConfetti(rx, ry, 0xfacc15, 12);
    Sound.play('cherry_clone');
  };

  const handleCloneWave = () => {
    simulation.triggerCloneWave();
  };

  return (
    <div className="z-10 flex items-center justify-center gap-1.5 py-1 px-2">
      <div className="flex items-center gap-1 bg-indigo-100 paper-card px-2 py-1">
        <span className="text-[11px] font-extrabold text-slate-700 hidden sm:inline mr-1">
          DROP ON TRACK:
        </span>
        <button
          onClick={() => handleSpawn('cherry_clone')}
          className="paper-btn bg-rose-100 hover:bg-rose-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Drop Cloning Cherries on Track"
        >
          <Copy className="w-3 h-3 text-rose-700" />
          <span>+Clone</span>
        </button>
        <button
          onClick={() => handleSpawn('knife')}
          className="paper-btn bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Drop Lethal Kitchen Knife on Track"
        >
          <Sword className="w-3 h-3 text-slate-800" />
          <span>+Knife</span>
        </button>
        <button
          onClick={() => handleSpawn('star_dash')}
          className="paper-btn bg-yellow-200 hover:bg-yellow-100 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Drop Turbo Star on Track"
        >
          <Star className="w-3 h-3 fill-amber-400 text-amber-700" />
          <span>+Star</span>
        </button>
        <button
          onClick={() => handleSpawn('shield')}
          className="paper-btn bg-cyan-100 hover:bg-cyan-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-1"
          title="Drop Cardboard Shield on Track"
        >
          <Shield className="w-3 h-3 text-sky-700" />
          <span>+Shield</span>
        </button>
        <button
          onClick={handleCloneWave}
          className="paper-btn bg-purple-300 hover:bg-purple-200 text-slate-900 text-xs px-2 py-0.5 flex items-center gap-0.5"
          title="Duplicate Every Alive Racer!"
        >
          <Zap className="w-3 h-3 fill-current text-purple-900" />
          <span>2x All</span>
        </button>
      </div>
    </div>
  );
};
