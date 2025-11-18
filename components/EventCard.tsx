import React from 'react';
import { GameEvent, Choice } from '../types';
import { playSound } from '../utils/audio';

interface Props {
  event: GameEvent;
  onChoose: (choiceId: string) => void;
  loading: boolean;
}

const EventCard: React.FC<Props> = ({ event, onChoose, loading }) => {
  return (
    <div className="w-full max-w-3xl mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-600/50 rounded-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in ring-1 ring-white/5 relative">
      
      {/* Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-0 bg-[length:100%_3px,4px_100%]" />

      {/* Header */}
      <div className="relative z-10 bg-zinc-800/80 p-6 border-b border-zinc-700 flex justify-between items-start">
        <div className="flex flex-col">
           <span className="text-[10px] text-amber-500/80 uppercase tracking-[0.2em] mb-1 font-bold">Incoming Transmission</span>
           <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight drop-shadow-sm font-mono">{event.title}</h2>
        </div>
        <div className="flex items-center gap-2 mt-1">
            <div className="text-[10px] text-red-500 font-mono animate-pulse tracking-widest">PRIORITY ALPHA</div>
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-10">
        <div className="mb-10 text-lg md:text-xl leading-relaxed text-zinc-300 border-l-4 border-amber-600/40 pl-6 font-serif italic tracking-wide">
          "{event.description}"
        </div>

        {/* Choices */}
        <div className="space-y-4">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => onChoose(choice.id)}
              onMouseEnter={() => playSound('hover')}
              disabled={loading}
              className={`w-full group relative flex flex-col md:flex-row md:items-center justify-between p-5 text-left border transition-all duration-200 transform
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]'}
                ${getChoiceStyle(choice.type)}
              `}
            >
              <div className="relative z-10 flex-1">
                 <div className="flex items-center gap-2 mb-1 md:mb-0">
                    <span className="w-1.5 h-1.5 bg-current rounded-full opacity-50"></span>
                    <span className="block font-bold font-sans text-base md:text-lg tracking-tight group-hover:text-white transition-colors">{choice.text}</span>
                 </div>
              </div>
              
              <div className="relative z-10 mt-2 md:mt-0 md:ml-4 flex items-center">
                <span className={`text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-wider border shadow-sm ${getRiskBadge(choice.riskLabel)}`}>
                    {choice.riskLabel}
                </span>
              </div>
              
              {/* Hover sheen */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none"></div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 backdrop-blur-sm transition-opacity duration-300">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-zinc-800 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-amber-500 rounded-full animate-spin border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center text-amber-500 font-mono text-xs animate-pulse">
                    AI
                </div>
            </div>
            <div className="flex flex-col items-center space-y-1">
                <span className="text-amber-500 font-mono text-sm tracking-[0.2em] uppercase animate-pulse">Calculating Outcome</span>
                <span className="text-zinc-600 font-mono text-xs">Generating probabilities...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getChoiceStyle = (type: Choice['type']) => {
  switch (type) {
    case 'aggressive': return 'border-red-900/30 bg-gradient-to-r from-red-950/40 to-zinc-900/80 hover:border-red-500/60 hover:from-red-900/20';
    case 'diplomatic': return 'border-blue-900/30 bg-gradient-to-r from-blue-950/40 to-zinc-900/80 hover:border-blue-500/60 hover:from-blue-900/20';
    case 'sacrifice': return 'border-purple-900/30 bg-gradient-to-r from-purple-950/40 to-zinc-900/80 hover:border-purple-500/60 hover:from-purple-900/20';
    default: return 'border-zinc-700/50 bg-zinc-800/40 hover:bg-zinc-800 hover:border-zinc-500';
  }
};

const getRiskBadge = (label: string) => {
  if (label.includes('高') || label.includes('死') || label.includes('危') || label.includes('High')) return 'bg-red-950/80 border-red-900 text-red-400 shadow-red-900/20';
  if (label.includes('安') || label.includes('低') || label.includes('稳') || label.includes('Safe')) return 'bg-emerald-950/80 border-emerald-900 text-emerald-400 shadow-emerald-900/20';
  return 'bg-zinc-800 border-zinc-700 text-zinc-400';
};

export default EventCard;