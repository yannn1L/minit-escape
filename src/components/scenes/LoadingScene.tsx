import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingSceneProps {
  onLoaded: () => void;
}

export const LoadingScene: React.FC<LoadingSceneProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onLoaded, 350);
          return 100;
        }
        return prev + Math.floor(Math.random() * 18) + 10;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onLoaded]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 sm:p-6 text-center select-none relative">
      {/* Subtle Paper Grid Backdrop */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-15 z-0" />

      {/* Paper Card Loading Container */}
      <div className="z-10 paper-card bg-amber-50 max-w-md w-full p-5 sm:p-7 flex flex-col landscape:flex-row sm:flex-col items-center gap-4 sm:gap-5 shadow-[6px_8px_0px_#0f172a] border-[3px] border-slate-900">
        {/* Animated Square Racer Mascot */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500 border-[3px] border-slate-900 rounded-lg shadow-[4px_4px_0px_#0f172a] flex items-center justify-center animate-bounce">
            <div className="flex gap-1.5">
              <div className="w-4 h-4 bg-white border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-900 translate-x-0.5"></div>
              </div>
              <div className="w-4 h-4 bg-white border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-900 translate-x-0.5"></div>
              </div>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-500 absolute -top-2 -right-2 animate-spin" />
        </div>

        <div className="flex-1 w-full flex flex-col items-center landscape:items-start sm:items-center gap-3">
          {/* Title */}
          <div className="flex flex-col text-center landscape:text-left sm:text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Minit Escape!
            </h1>
            <span className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
              Preparing track studio & physics simulation
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-1.5">
            <div className="w-full bg-slate-200 border-2 border-slate-900 rounded-full h-4 overflow-hidden p-0.5 shadow-inner">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-150 border-r-2 border-slate-900"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full text-xs font-extrabold text-slate-700">
              <span>Loading studio workspace</span>
              <span className="mono-num">{Math.min(100, progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
