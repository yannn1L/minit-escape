import React from 'react';
import type { TeamLiveStats } from '../types/game';

interface LeaderboardBarProps {
  stats: TeamLiveStats[];
  styleMode?: 'detailed' | 'compact';
  columnsMode?: 'auto' | '8' | '4';
  position?: 'bottom' | 'top';
}

export const LeaderboardBar: React.FC<LeaderboardBarProps> = ({
  stats,
  styleMode = 'detailed',
  columnsMode = 'auto',
  position = 'bottom',
}) => {
  const gridColsClass =
    columnsMode === '8'
      ? 'grid-cols-8'
      : columnsMode === '4'
      ? 'grid-cols-4'
      : 'grid-cols-4 landscape:grid-cols-8 sm:grid-cols-8';

  const isCompact = styleMode === 'compact';

  return (
    <div
      className={`w-full ${
        position === 'top' ? 'pb-1.5' : 'pt-1.5'
      } flex flex-col items-center shrink-0`}
    >
      <div
        className={`w-full grid ${gridColsClass} gap-1 bg-[#1e293b] ${
          isCompact ? 'p-0.5 sm:p-1' : 'p-1 sm:p-1.5'
        } rounded-lg border-2 border-slate-950 shadow-inner`}
      >
        {stats.map(({ team, maxProgress, anyAlive, aliveCount }) => {
          const bg = anyAlive ? team.css : '#64748b';
          const shapeClass =
            team.shape === 'circle'
              ? 'rounded-full'
              : team.shape === 'rounded'
              ? 'rounded-[3px]'
              : 'rounded-[1.5px]';
          const badge =
            aliveCount > 1 ? (
              <span className="text-[8.5px] bg-black/55 px-1 rounded font-bold leading-tight">
                x{aliveCount}
              </span>
            ) : null;

          return (
            <div
              key={team.id}
              className={`flex items-center justify-between ${
                isCompact ? 'px-1 py-0.5' : 'px-1.5 py-0.5 sm:py-1'
              } rounded text-white border-2 border-slate-950 shadow-[0_2px_0_#000] transition-transform duration-150 min-w-0`}
              style={{
                backgroundColor: bg,
                opacity: anyAlive ? 1 : 0.65,
              }}
              title={`${team.name}: ${maxProgress}% Progress (${aliveCount} alive)`}
            >
              {/* Left: Mini Paper Racer with Eyes + Optional Team Name in Detailed Mode */}
              <div className="flex items-center gap-1 min-w-0">
                <div
                  className={`${
                    isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'
                  } border border-black ${shapeClass} flex items-center justify-center gap-[1px] shrink-0 shadow-sm`}
                  style={{
                    backgroundColor: anyAlive ? team.css : '#475569',
                  }}
                >
                  <div className="w-1 h-1 bg-white"></div>
                  <div className="w-1 h-1 bg-white"></div>
                </div>
                {!isCompact && (
                  <span className="hidden md:inline text-[9px] font-black tracking-tight truncate drop-shadow-[1px_1px_0px_#000]">
                    {team.name}
                  </span>
                )}
              </div>

              {/* Progress & Multiplier */}
              <div className="flex items-center gap-0.5 leading-none shrink-0">
                <span
                  className={`mono-num font-extrabold ${
                    isCompact ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[10px] sm:text-xs'
                  } drop-shadow-[1px_1px_0px_#000]`}
                >
                  {maxProgress}%
                </span>
                {badge}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

