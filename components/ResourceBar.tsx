import React from 'react';
import { GameState } from '../types';

interface Props {
  state: GameState;
}

const ResourceBar: React.FC<Props> = ({ state }) => {
  const getMoodColor = (mood: number) => {
    if (mood > 70) return 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20';
    if (mood > 30) return 'text-amber-400 border-amber-500/30 bg-amber-900/20';
    return 'text-red-500 border-red-500/50 bg-red-900/30 animate-pulse';
  };

  const getFoodColor = (food: number) => {
    if (food > 20) return 'text-zinc-200 border-zinc-700 bg-zinc-800/50';
    return 'text-red-400 border-red-500/50 bg-red-900/20';
  };

  return (
    <div className="w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 p-3 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Stats Cluster */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          {/* Day */}
          <div className="flex items-center px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-sm min-w-[100px]">
            <div className="mr-3 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Day</span>
              <span className="text-lg font-mono font-bold text-white">{state.day}</span>
            </div>
          </div>

          {/* Food */}
          <div className={`flex items-center px-4 py-2 border rounded-sm min-w-[110px] transition-colors ${getFoodColor(state.food)}`}>
            <div className="mr-3 opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
                </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Food</span>
              <span className="text-lg font-mono font-bold">{state.food}kg</span>
            </div>
          </div>

          {/* Mood */}
          <div className={`flex items-center px-4 py-2 border rounded-sm min-w-[110px] transition-colors ${getMoodColor(state.mood)}`}>
            <div className="mr-3 opacity-70">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                 </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Mood</span>
              <span className="text-lg font-mono font-bold">{state.mood}%</span>
            </div>
          </div>
        </div>

        {/* Distance Progress */}
        <div className="flex-1 w-full md:mx-8">
          <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
            <span>Sector Start</span>
            <span className="text-amber-500">{state.distanceTraveled} / {state.distanceTotal} KM</span>
            <span>Extraction Point</span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700 relative">
            {/* Ticks */}
            <div className="absolute inset-0 flex justify-between px-2">
                 {[...Array(10)].map((_, i) => <div key={i} className="w-[1px] h-full bg-zinc-800"></div>)}
            </div>
            <div 
              className="h-full bg-gradient-to-r from-amber-700 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000 ease-out relative z-10"
              style={{ width: `${Math.min(100, (state.distanceTraveled / state.distanceTotal) * 100)}%` }}
            >
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Biome Label */}
        <div className="hidden md:block px-3 py-1 bg-black/40 border border-zinc-800 rounded text-xs font-mono text-zinc-400">
           SEC: <span className="text-amber-500 font-bold uppercase">{state.biome}</span>
        </div>

      </div>
    </div>
  );
};

export default ResourceBar;