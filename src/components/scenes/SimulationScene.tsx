import React, { useState, useEffect, useRef } from 'react';
import type { RaceSimulation } from '../../simulation/RaceSimulation';
import { GameCanvas } from '../GameCanvas';
import { LeaderboardBar } from '../LeaderboardBar';
import { VictoryModal } from '../VictoryModal';
import { GameOverModal } from '../GameOverModal';
import type { TeamConfig, TeamLiveStats, ViewportAspectRatio } from '../../types/game';
import { DEFAULT_LAYOUT_CONFIG } from '../../types/game';
import { Timer } from 'lucide-react';

interface SimulationSceneProps {
  simulation: RaceSimulation;
  onBackToEditor?: () => void;
}

export const SimulationScene: React.FC<SimulationSceneProps> = ({
  simulation,
  onBackToEditor,
}) => {
  const [stats, setStats] = useState<TeamLiveStats[]>([]);
  const [winner, setWinner] = useState<TeamConfig | null>(null);
  const [allEliminated, setAllEliminated] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const layout = simulation.layoutConfig || DEFAULT_LAYOUT_CONFIG;
  const [aspectRatio, setAspectRatio] = useState<ViewportAspectRatio>(
    layout.aspectRatio || '4:3'
  );

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    setAspectRatio(simulation.layoutConfig?.aspectRatio || '4:3');
  }, [simulation]);

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const updateStageSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
    };
    updateStageSize();
    const ro = new ResizeObserver(updateStageSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setWinner(null);
    setAllEliminated(false);

    // Unpause and ensure smooth full speed
    simulation.paused = false;

    const timer = setInterval(() => {
      if (!simulation.winnerDeclared && !simulation.allEliminatedDeclared) {
        const sec = Math.floor((performance.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(prev => (prev === sec ? prev : sec));
      }
    }, 250);

    simulation.onStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    simulation.onWinnerDeclared = (team) => {
      setWinner(team);
    };

    simulation.onAllEliminated = () => {
      setAllEliminated(true);
    };

    return () => {
      clearInterval(timer);
      simulation.onStatsUpdate = null;
      simulation.onWinnerDeclared = null;
      simulation.onAllEliminated = null;
    };
  }, [simulation]);

  const handleRestart = () => {
    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setWinner(null);
    setAllEliminated(false);
    simulation.loadRace(simulation.currentMapKey, simulation.currentMap);
  };

  const handleSelectAspect = (ratio: ViewportAspectRatio) => {
    setAspectRatio(ratio);
    if (simulation.layoutConfig) {
      simulation.layoutConfig.aspectRatio = ratio;
    }
    if (simulation.currentMap.layoutConfig) {
      simulation.currentMap.layoutConfig.aspectRatio = ratio;
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const themeBgClass =
    layout.arenaTheme === 'midnight'
      ? 'bg-[#1e293b]'
      : layout.arenaTheme === 'emerald'
      ? 'bg-[#059669]'
      : layout.arenaTheme === 'sunset'
      ? 'bg-[#d97706]'
      : layout.arenaTheme === 'violet'
      ? 'bg-[#7c3aed]'
      : 'bg-[#4895ef]';

  const framePaddingClass =
    layout.arenaPadding === 'compact'
      ? 'p-1 sm:p-1.5'
      : layout.arenaPadding === 'spacious'
      ? 'p-2.5 sm:p-4'
      : 'p-1.5 sm:p-2.5';

  // Compute exact fitted dimensions for the arena canvas when aspectRatio is 1:1, 16:9, or 4:3
  const fittedCanvasBox = (() => {
    if (aspectRatio === 'auto' || stageSize.w <= 0 || stageSize.h <= 0) {
      return null;
    }
    const targetRatio =
      aspectRatio === '1:1' ? 1.0 : aspectRatio === '16:9' ? 16 / 9 : 4 / 3;
    const availW = stageSize.w;
    const availH = stageSize.h;
    let w = availW;
    let h = Math.round(w / targetRatio);
    if (h > availH) {
      h = availH;
      w = Math.round(h * targetRatio);
    }
    return { width: Math.max(160, w), height: Math.max(120, h) };
  })();

  const showHeaderRow = layout.showTitle !== false || layout.showTimer !== false;
  const displayTitle =
    layout.customTitle && layout.customTitle.trim().length > 0
      ? layout.customTitle
      : 'Minit Escape!';

  const timerNode =
    layout.showTimer !== false ? (
      <div className="flex items-center gap-1.5 bg-white paper-card px-2.5 py-0.5 sm:py-1 text-slate-900 font-extrabold text-xs sm:text-sm shadow-xs shrink-0">
        <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 stroke-[2.5]" />
        <span className="mono-num tracking-wide">{formatTimer(elapsedSeconds)}</span>
      </div>
    ) : null;

  const titleNode =
    layout.showTitle !== false ? (
      <div className="flex items-center gap-1.5 bg-amber-100 paper-card px-3 py-0.5 sm:py-1 shadow-xs min-w-0">
        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 border-2 border-slate-900 rounded-sm relative flex items-center justify-center shadow-sm shrink-0">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 bg-white border border-black"></div>
            <div className="w-1 h-1 bg-white border border-black"></div>
          </div>
        </div>
        <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
          {displayTitle}
        </span>
      </div>
    ) : null;

  const aspectSelectorNode = (
    <div className="flex items-center gap-0.5 bg-white/95 border-2 border-slate-900 rounded-lg p-0.5 shadow-[1.5px_2px_0px_#0f172a] shrink-0">
      {(['1:1', '16:9', '4:3', 'auto'] as ViewportAspectRatio[]).map(ratio => {
        const active = aspectRatio === ratio;
        return (
          <button
            key={ratio}
            type="button"
            onClick={() => handleSelectAspect(ratio)}
            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase transition-colors cursor-pointer ${
              active
                ? 'bg-amber-300 text-slate-950 border border-slate-900'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={`Set Arena Viewport Aspect Ratio to ${ratio === 'auto' ? 'Full Auto' : ratio}`}
          >
            {ratio === 'auto' ? 'Full' : ratio}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-dvh w-screen overflow-hidden relative select-none p-1.5 sm:p-2.5">
      {/* Background Craft Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-15 z-0" />

      {/* Main Center Stage: Dynamic Arena Frame */}
      <main className="z-10 flex-1 w-full h-full flex flex-col items-center justify-center min-h-0">
        <div
          id="gameFrame"
          className={`relative w-full h-full flex flex-col items-center justify-between ${themeBgClass} border-[3px] border-slate-900 rounded-xl shadow-[4px_6px_0px_rgba(15,23,42,0.85)] ${framePaddingClass} overflow-hidden`}
        >
          {/* Top Header Row: Configurable Timer, Title & Viewport Aspect Ratio Switcher */}
          {showHeaderRow ? (
            <div className="w-full relative flex items-center justify-between gap-1.5 mb-1.5 z-20 min-h-[28px] sm:min-h-[32px] shrink-0">
              {/* Left Slot */}
              <div className="flex items-center gap-1.5 min-w-0">
                {layout.timerPosition !== 'right' && timerNode}
                {layout.titlePosition === 'left' && titleNode}
              </div>

              {/* Center Slot */}
              <div className="flex items-center justify-center min-w-0">
                {(!layout.titlePosition || layout.titlePosition === 'center') && titleNode}
              </div>

              {/* Right Slot */}
              <div className="flex items-center justify-end gap-1.5 shrink-0">
                {layout.titlePosition === 'right' && titleNode}
                {layout.timerPosition === 'right' && timerNode}
                {aspectSelectorNode}
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-end mb-1 z-20 shrink-0">
              {aspectSelectorNode}
            </div>
          )}

          {/* Optional Top Racers List (when configured to 'top') */}
          {layout.showRacersList !== false && layout.racersListPosition === 'top' && (
            <LeaderboardBar
              stats={stats}
              styleMode={layout.racersListStyle || 'detailed'}
              columnsMode={layout.racersListColumns || 'auto'}
              position="top"
            />
          )}

          {/* Dynamic Arena Stage: Fits chosen Aspect Ratio (1:1, 16:9, 4:3, or Full Auto) */}
          <div
            ref={stageRef}
            className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden"
          >
            <div
              style={{
                width: fittedCanvasBox ? `${fittedCanvasBox.width}px` : '100%',
                height: fittedCanvasBox ? `${fittedCanvasBox.height}px` : '100%',
              }}
              className="relative flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(15,23,42,0.35)] rounded-lg overflow-hidden"
            >
              <GameCanvas simulation={simulation} />
            </div>
          </div>

          {/* Default Bottom Racers List (when configured to 'bottom') */}
          {layout.showRacersList !== false && layout.racersListPosition !== 'top' && (
            <LeaderboardBar
              stats={stats}
              styleMode={layout.racersListStyle || 'detailed'}
              columnsMode={layout.racersListColumns || 'auto'}
              position="bottom"
            />
          )}
        </div>
      </main>

      {/* Victory Celebration Modal (Centered in the Scene) */}
      {winner && (
        <VictoryModal
          team={winner}
          onRestart={handleRestart}
          onBackToEditor={onBackToEditor}
        />
      )}

      {/* Game Over Modal (When all racers are eliminated) */}
      {allEliminated && !winner && (
        <GameOverModal
          onRestart={handleRestart}
          onBackToEditor={onBackToEditor}
        />
      )}
    </div>
  );
};

