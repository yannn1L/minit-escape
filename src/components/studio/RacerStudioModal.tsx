import React, { useState } from 'react';
import type { TeamConfig } from '../../types/game';
import { X, Check, Users } from 'lucide-react';

interface RacerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamConfig[];
  onUpdateTeams: (newTeams: TeamConfig[]) => void;
}

export const RacerStudioModal: React.FC<RacerStudioModalProps> = ({
  isOpen,
  onClose,
  teams,
  onUpdateTeams,
}) => {
  const [teamList, setTeamList] = useState<TeamConfig[]>(JSON.parse(JSON.stringify(teams)));

  if (!isOpen) return null;

  const handleUpdate = (idx: number, field: keyof TeamConfig, value: any) => {
    const updated = [...teamList];
    updated[idx] = { ...updated[idx], [field]: value };
    setTeamList(updated);
  };

  const handleApply = () => {
    onUpdateTeams(teamList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="paper-card bg-rose-50 w-full max-w-xl max-h-[90vh] flex flex-col p-4 shadow-[8px_10px_0px_#0f172a]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-700" />
            <span className="text-base sm:text-lg font-black text-slate-900">
              Custom Racer Studio & Team Roster
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
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <p className="text-xs text-slate-600 font-medium">
            Customize the 8 square racer teams, their brand colors, base movement velocity, and paper squash elasticity factors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {teamList.map((team, idx) => (
              <div
                key={team.id}
                className="paper-card bg-white p-2.5 space-y-2 border-2 border-slate-900"
              >
                <div className="flex items-center gap-2">
                  {/* Color box with input */}
                  <div
                    className="w-7 h-7 rounded border-2 border-slate-900 relative shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: team.css }}
                  >
                    <input
                      type="color"
                      value={team.css}
                      onChange={(e) => {
                        const hexStr = e.target.value;
                        const hexNum = parseInt(hexStr.replace('#', ''), 16);
                        handleUpdate(idx, 'css', hexStr);
                        handleUpdate(idx, 'hex', hexNum);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Click to pick team color"
                    />
                    <div className="flex gap-0.5 pointer-events-none">
                      <div className="w-1 h-1 bg-white border border-black"></div>
                      <div className="w-1 h-1 bg-white border border-black"></div>
                    </div>
                  </div>

                  {/* Team Name */}
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleUpdate(idx, 'name', e.target.value.toUpperCase())}
                    className="paper-btn px-2 py-0.5 text-xs font-black text-slate-900 flex-1 focus:outline-none"
                  />
                </div>

                {/* Speed Slider */}
                <div className="text-[11px] font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>Base Speed</span>
                    <span className="mono-num">{team.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="5.0"
                    step="0.25"
                    value={team.speed}
                    onChange={(e) => handleUpdate(idx, 'speed', Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="paper-btn bg-slate-200 hover:bg-slate-300 text-xs px-3 py-1.5 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="paper-btn bg-rose-400 hover:bg-rose-300 text-slate-900 text-xs px-4 py-1.5 flex items-center gap-1 font-black"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Apply to Next Race</span>
          </button>
        </div>
      </div>
    </div>
  );
};
