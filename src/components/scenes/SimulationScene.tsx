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

const RaceTimer: React.FC<{ simulation: RaceSimulation; resetKey: number }> = React.memo(({
  simulation,
  resetKey,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    const timer = setInterval(() => {
      if (!simulation.winnerDeclared && !simulation.allEliminatedDeclared && !simulation.paused) {
        const sec = Math.floor((performance.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(prev => (prev === sec ? prev : sec));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [simulation, resetKey]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1.5 bg-white paper-card px-2.5 py-0.5 sm:py-1 text-slate-900 font-extrabold text-xs sm:text-sm shrink-0">
      <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 stroke-[2.5]" />
      <span className="mono-num tracking-wide">{formatted}</span>
    </div>
  );
});

export const SimulationScene: React.FC<SimulationSceneProps> = ({
  simulation,
  onBackToEditor,
}) => {
  const [stats, setStats] = useState<TeamLiveStats[]>([]);
  const [winner, setWinner] = useState<TeamConfig | null>(null);
  const [allEliminated, setAllEliminated] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const layout = simulation.layoutConfig || DEFAULT_LAYOUT_CONFIG;
  const aspectRatio: ViewportAspectRatio = layout.aspectRatio || '4:3';

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const updateStageSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nextW = Math.floor(rect.width);
        const nextH = Math.floor(rect.height);
        setStageSize(prev => (prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }));
      }
    };
    updateStageSize();
    const ro = new ResizeObserver(updateStageSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setWinner(null);
    setAllEliminated(false);

    // Unpause and ensure smooth full speed
    simulation.paused = false;

    simulation.onStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    simulation.onWinnerDeclared = (team) => {
      setWinner(team);
    };

    simulation.onAllEliminated = () => {
      setAllEliminated(true);
    };

    simulation.notifyStatsChanged(true);

    return () => {
      simulation.onStatsUpdate = null;
      simulation.onWinnerDeclared = null;
      simulation.onAllEliminated = null;
    };
  }, [simulation]);

  const handleRestart = () => {
    setResetKey(prev => prev + 1);
    setWinner(null);
    setAllEliminated(false);
    simulation.loadRace(simulation.currentMapKey, simulation.currentMap);
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

  const vScale = Math.max(0.25, (layout.viewportScale ?? 100) / 100);
  const vOffsetX = layout.viewportOffsetX ?? 0;
  const vOffsetY = layout.viewportOffsetY ?? 0;

  const titleScale = Math.max(0.25, (layout.titleScale ?? 100) / 100);
  const titleOffsetX = layout.titleOffsetX ?? 0;
  const titleOffsetY = layout.titleOffsetY ?? 0;

  const timerScale = Math.max(0.25, (layout.timerScale ?? 100) / 100);
  const timerOffsetX = layout.timerOffsetX ?? 0;
  const timerOffsetY = layout.timerOffsetY ?? 0;

  const racersListScale = Math.max(0.25, (layout.racersListScale ?? 100) / 100);
  const racersListOffsetX = layout.racersListOffsetX ?? 0;
  const racersListOffsetY = layout.racersListOffsetY ?? 0;

  // Compute exact fitted dimensions for the arena canvas (incorporating viewportScale natively so canvas stays HiDPI-sharp)
  const fittedCanvasBox = (() => {
    if (stageSize.w <= 0 || stageSize.h <= 0) {
      return null;
    }
    if (aspectRatio === 'auto') {
      return {
        width: Math.max(120, Math.round(stageSize.w * vScale)),
        height: Math.max(100, Math.round(stageSize.h * vScale)),
      };
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
    return {
      width: Math.max(120, Math.round(w * vScale)),
      height: Math.max(100, Math.round(h * vScale)),
    };
  })();

  const showHeaderRow = layout.showTitle !== false || layout.showTimer !== false;
  const displayTitle =
    layout.customTitle && layout.customTitle.trim().length > 0
      ? layout.customTitle
      : 'Minit Escape!';

  const timerNode =
    layout.showTimer !== false ? (
      <div
        style={{
          transform: `translate(${timerOffsetX}px, ${timerOffsetY}px) scale(${timerScale})`,
          transformOrigin: layout.timerPosition === 'right' ? 'right center' : 'left center',
        }}
        className="shrink-0 z-20"
      >
        <RaceTimer simulation={simulation} resetKey={resetKey} />
      </div>
    ) : null;

  const titleNode =
    layout.showTitle !== false ? (
      <div
        style={{
          transform: `translate(${titleOffsetX}px, ${titleOffsetY}px) scale(${titleScale})`,
          transformOrigin:
            layout.titlePosition === 'left'
              ? 'left center'
              : layout.titlePosition === 'right'
              ? 'right center'
              : 'center center',
        }}
        className="flex items-center gap-1.5 bg-amber-100 paper-card px-3 py-0.5 sm:py-1 min-w-0 z-20"
      >
        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 border-2 border-slate-900 rounded-sm relative flex items-center justify-center shrink-0">
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

  return (
    <div className="flex flex-col items-center justify-center h-dvh w-screen overflow-hidden relative select-none p-1.5 sm:p-2.5">
      {/* Main Center Stage: Dynamic Arena Frame */}
      <main className="z-10 flex-1 w-full h-full flex flex-col items-center justify-center min-h-0">
        <div
          id="gameFrame"
          className={`relative w-full h-full flex flex-col items-center justify-between ${themeBgClass} border-[3px] border-slate-900 rounded-xl shadow-[3px_4px_0px_#0f172a] ${framePaddingClass} overflow-hidden`}
        >
          {/* Top Header Row: Configurable Timer & Title */}
          {showHeaderRow && (
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
              </div>
            </div>
          )}

          {/* Optional Top Racers List (when configured to 'top') */}
          {layout.showRacersList !== false && layout.racersListPosition === 'top' && (
            <div
              style={{
                transform: `translate(${racersListOffsetX}px, ${racersListOffsetY}px) scale(${racersListScale})`,
                transformOrigin: 'top center',
              }}
              className="w-full shrink-0 z-20"
            >
              <LeaderboardBar
                stats={stats}
                styleMode={layout.racersListStyle || 'detailed'}
                columnsMode={layout.racersListColumns || 'auto'}
                position="top"
              />
            </div>
          )}

          {/* Dynamic Arena Stage: Fits chosen Aspect Ratio, Size (%), and Offset Position (X, Y) */}
          <div
            ref={stageRef}
            className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden"
          >
            <div
              style={{
                width: fittedCanvasBox ? `${fittedCanvasBox.width}px` : '100%',
                height: fittedCanvasBox ? `${fittedCanvasBox.height}px` : '100%',
                transform:
                  vOffsetX !== 0 || vOffsetY !== 0
                    ? `translate(${vOffsetX}px, ${vOffsetY}px)`
                    : undefined,
              }}
              className="relative flex flex-col items-center justify-center rounded-lg overflow-hidden shrink-0"
            >
              <GameCanvas simulation={simulation} />
            </div>
          </div>

          {/* Default Bottom Racers List (when configured to 'bottom') */}
          {layout.showRacersList !== false && layout.racersListPosition !== 'top' && (
            <div
              style={{
                transform: `translate(${racersListOffsetX}px, ${racersListOffsetY}px) scale(${racersListScale})`,
                transformOrigin: 'bottom center',
              }}
              className="w-full shrink-0 z-20"
            >
              <LeaderboardBar
                stats={stats}
                styleMode={layout.racersListStyle || 'detailed'}
                columnsMode={layout.racersListColumns || 'auto'}
                position="bottom"
              />
            </div>
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

