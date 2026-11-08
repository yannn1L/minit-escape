import React, { useState, useEffect, useRef } from 'react';
import type { TeamConfig } from '../types/game';
import { Trophy, Clock } from 'lucide-react';

interface VictoryModalProps {
  team: TeamConfig;
  onBackToEditor?: () => void;
  onRestart?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ team, onBackToEditor, onRestart }) => {
  const [countdown, setCountdown] = useState(3);
  const onBackRef = useRef(onBackToEditor);
  const onRestartRef = useRef(onRestart);
  onBackRef.current = onBackToEditor;
  onRestartRef.current = onRestart;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      if (onBackRef.current) {
        onBackRef.current();
      } else {
        onRestartRef.current?.();
      }
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      onClick={() => {
        if (onBackRef.current) onBackRef.current();
        else onRestartRef.current?.();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/40 cursor-pointer"
    >
      <div className="paper-card bg-yellow-300 px-7 py-5 flex flex-col items-center text-center shadow-[6px_8px_0px_#0f172a] max-w-xs sm:max-w-sm w-full mx-4 border-2 border-slate-900">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
          <Trophy className="w-5 h-5 text-amber-800 fill-current" />
          <span>WINNER REACHED 100%!</span>
          <Trophy className="w-5 h-5 text-amber-800 fill-current" />
        </div>
        <span
          className="text-2xl sm:text-3xl font-black mt-1 tracking-tight drop-shadow-[1px_1px_0px_#fff]"
          style={{ color: team.css }}
        >
          {team.name} WINS!
        </span>

        {/* Automatic transition to editor scene in 3 seconds */}
        <div className="mt-4 flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-1.5 bg-white/95 border border-slate-900 px-3 py-1.5 rounded-full text-xs font-black text-slate-800 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-700 animate-spin" />
            <span>Returning to editor in {countdown}s...</span>
          </div>
          <div className="w-full bg-slate-900/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-slate-900 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((3 - countdown) / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

