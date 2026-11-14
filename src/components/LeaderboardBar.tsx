import React from 'react';
import type { TeamLiveStats, TrackType, WeaponType } from '../types/game';

interface LeaderboardBarProps {
  stats: TeamLiveStats[];
  styleMode?: 'detailed' | 'compact';
  columnsMode?: 'auto' | '8' | '4';
  position?: 'bottom' | 'top';
  trackType?: TrackType;
}

const WEAPON_SHORT_LABELS: Record<WeaponType, string> = {
  knife: 'KNF',
  uzi: 'UZI',
  ump: 'UMP',
  ak: 'AK',
  mini14: 'M14',
  scar: 'SCAR',
};

const BulletCartridgeSvg: React.FC = () => (
  <svg viewBox="0 0 8 14" className="w-2 h-2.5 inline-block shrink-0" aria-hidden="true">
    <path d="M4 0.5 L7 4.5 L1 4.5 Z" fill="#f97316" stroke="#0f172a" strokeWidth="1" />
    <rect x="1" y="4.5" width="6" height="8.5" fill="#facc15" stroke="#0f172a" strokeWidth="1" />
  </svg>
);

export const LeaderboardBar: React.FC<LeaderboardBarProps> = React.memo(({
  stats,
  styleMode = 'detailed',
  columnsMode = 'auto',
  position = 'bottom',
  trackType = 'races',
}) => {
  const gridColsClass =
    columnsMode === '8'
      ? 'grid-cols-8'
      : columnsMode === '4'
      ? 'grid-cols-4'
      : 'grid-cols-4 landscape:grid-cols-8 sm:grid-cols-8';

  const isCompact = styleMode === 'compact';
  const isBattler = trackType === 'battler';

  return (
    <div
      className={`w-full ${
        position === 'top' ? 'pb-1.5' : 'pt-1.5'
      } flex flex-col items-center shrink-0`}
    >
      <div
        className={`w-full grid ${gridColsClass} gap-1 bg-[#1e293b] ${
          isCompact ? 'p-0.5 sm:p-1' : 'p-1 sm:p-1.5'
        } rounded-lg border-2 border-slate-950`}
      >
        {stats.map(({ team, maxProgress, anyAlive, aliveCount, hp, maxHp, weapon, weaponAmmo, battleAlliance }) => {
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

          const safeMaxHp = Math.max(1, maxHp || 100);
          const safeHp = anyAlive ? Math.max(0, Math.round((hp ?? 100) * 10) / 10) : 0;
          const displayHp = anyAlive ? Math.max(1, Math.ceil(safeHp)) : 0;
          const hpPct = Math.max(0, Math.min(100, Math.round((safeHp / safeMaxHp) * 100)));
          const hasGunAmmo = anyAlive && weapon && weapon !== 'knife' && (weaponAmmo ?? 0) > 0;

          if (isBattler) {
            const hpFillColor =
              hpPct > 55 ? '#4ade80' : hpPct > 25 ? '#facc15' : '#ef4444';

            return (
              <div
                key={team.id}
                className={`flex flex-col justify-between ${
                  isCompact ? 'px-1 py-0.5 gap-0.5' : 'px-1.5 py-0.5 sm:py-1 gap-0.5'
                } rounded text-white border-2 border-slate-950 shadow-[0_2px_0_#000] min-w-0 relative overflow-hidden`}
                style={{
                  backgroundColor: bg,
                  opacity: anyAlive ? 1 : 0.6,
                }}
                title={`${team.name}: ${safeHp}/${safeMaxHp} HP${weapon ? ` · ${weapon.toUpperCase()}${hasGunAmmo ? ` (${weaponAmmo})` : ''}` : ''}`}
              >
                {/* Top Row: Racer Avatar + Name/Tag + HP Value */}
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <div
                      className={`${
                        isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'
                      } border border-black ${shapeClass} flex items-center justify-center gap-[1px] shrink-0`}
                      style={{
                        backgroundColor: anyAlive ? team.css : '#475569',
                      }}
                    >
                      <div className="w-1 h-1 bg-white"></div>
                      <div className="w-1 h-1 bg-white"></div>
                    </div>
                    {!isCompact && (
                      <span
                        style={{ textShadow: '1px 1px 0 #000' }}
                        className="hidden md:inline text-[9px] font-black tracking-tight truncate"
                      >
                        {team.name}
                      </span>
                    )}
                    {battleAlliance === 'boss' && (
                      <span className="bg-amber-300 text-slate-950 border border-black px-0.5 rounded text-[7.5px] font-black leading-tight shrink-0">
                        BOSS
                      </span>
                    )}
                    {(battleAlliance === 'A' || battleAlliance === 'B') && (
                      <span className="bg-black/60 text-white px-0.5 rounded text-[7.5px] font-black leading-tight shrink-0">
                        {battleAlliance}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 leading-none shrink-0">
                    {anyAlive && weapon && (
                      <span className="bg-slate-950/85 text-amber-300 border border-black/50 px-1 py-0.2 rounded text-[7.5px] font-black tracking-tighter flex items-center gap-0.5">
                        <span>{WEAPON_SHORT_LABELS[weapon] || weapon.toUpperCase()}</span>
                        {hasGunAmmo && (
                          <>
                            <BulletCartridgeSvg />
                            <span className="text-white">{weaponAmmo}</span>
                          </>
                        )}
                      </span>
                    )}
                    <span
                      style={{ textShadow: '1px 1px 0 #000' }}
                      className={`mono-num font-extrabold ${
                        isCompact ? 'text-[9px] sm:text-[10px]' : 'text-[9.5px] sm:text-[11px]'
                      }`}
                    >
                      {anyAlive ? `${displayHp}HP` : 'KO'}
                    </span>
                    {badge}
                  </div>
                </div>

                {/* Bottom Row: Crisp Paper Health Bar */}
                <div className="w-full h-1.5 sm:h-2 bg-slate-950/75 rounded-xs border border-black overflow-hidden">
                  <div
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${anyAlive ? hpPct : 0}%`,
                      backgroundColor: hpFillColor,
                    }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div
              key={team.id}
              className={`flex items-center justify-between ${
                isCompact ? 'px-1 py-0.5' : 'px-1.5 py-0.5 sm:py-1'
              } rounded text-white border-2 border-slate-950 shadow-[0_2px_0_#000] min-w-0`}
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
                  } border border-black ${shapeClass} flex items-center justify-center gap-[1px] shrink-0`}
                  style={{
                    backgroundColor: anyAlive ? team.css : '#475569',
                  }}
                >
                  <div className="w-1 h-1 bg-white"></div>
                  <div className="w-1 h-1 bg-white"></div>
                </div>
                {!isCompact && (
                  <span
                    style={{ textShadow: '1px 1px 0 #000' }}
                    className="hidden md:inline text-[9px] font-black tracking-tight truncate"
                  >
                    {team.name}
                  </span>
                )}
              </div>

              {/* Progress, Optional Gun Ammo & Multiplier */}
              <div className="flex items-center gap-0.5 leading-none shrink-0">
                {hasGunAmmo && (
                  <span className="bg-slate-950/85 text-amber-300 border border-black/50 px-1 py-0.2 rounded text-[7.5px] font-black tracking-tighter flex items-center gap-0.5">
                    <BulletCartridgeSvg />
                    <span>{weaponAmmo}</span>
                  </span>
                )}
                <span
                  style={{ textShadow: '1px 1px 0 #000' }}
                  className={`mono-num font-extrabold ${
                    isCompact ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[10px] sm:text-xs'
                  }`}
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
});


