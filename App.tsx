import React, { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase, Biome, CrewMember } from './types';
import { generateGameEvent, resolveGameEvent } from './services/geminiService';
import ResourceBar from './components/ResourceBar';
import EventCard from './components/EventCard';
import CrewPanel from './components/CrewPanel';
import DynamicBackground from './components/DynamicBackground';
import { audioManager, playSound } from './utils/audio';

const INITIAL_CREW: CrewMember[] = [
  { id: '1', name: '万斯 (Vance)', role: '领队', status: '健康' },
  { id: '2', name: '多克 (Doc)', role: '医生', status: '健康' },
  { id: '3', name: '萨奇 (Sarge)', role: '战士', status: '健康' },
  { id: '4', name: '库克 (Cook)', role: '厨师', status: '健康' },
];

const INITIAL_STATE: GameState = {
  phase: GamePhase.MENU,
  day: 1,
  distanceTraveled: 0,
  distanceTotal: 1000, // km to ship
  food: 50, // kg
  mood: 100,
  credits: 500,
  crew: INITIAL_CREW,
  biome: Biome.ARID_SHRUBLAND,
  logs: ["系统初始化...", "生命维持系统正常。", "远行队集结完毕。逃生飞船位于东部 1000 公里处。"],
  currentEvent: null,
  lastResolution: null,
};

interface GameWrapperProps {
  children: React.ReactNode;
  biome: Biome;
  phase: GamePhase;
}

const GameWrapper: React.FC<GameWrapperProps> = ({ children, biome, phase }) => (
  <div className="min-h-screen flex flex-col relative overflow-hidden text-zinc-200 font-sans selection:bg-amber-500/30 selection:text-white">
    <DynamicBackground biome={biome} phase={phase} />
    <div className="z-10 flex flex-col min-h-screen w-full">
      {children}
    </div>
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Audio Ambience Sync
  useEffect(() => {
    // Ensure audio context is running and updating ambience when state changes
    audioManager.updateAmbience(gameState.biome, gameState.phase);
  }, [gameState.biome, gameState.phase]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameState.logs]);

  // Check Game Over / Victory conditions
  useEffect(() => {
    const aliveCrew = gameState.crew.filter(c => c.status !== '死亡').length;
    
    if (gameState.phase === GamePhase.MENU || gameState.phase === GamePhase.GAME_OVER || gameState.phase === GamePhase.VICTORY) return;

    if (aliveCrew === 0) {
      setGameState(prev => ({ ...prev, phase: GamePhase.GAME_OVER }));
      playSound('failure');
    } else if (gameState.distanceTraveled >= gameState.distanceTotal) {
      setGameState(prev => ({ ...prev, phase: GamePhase.VICTORY }));
      playSound('success');
    }
  }, [gameState.crew, gameState.distanceTraveled, gameState.phase, gameState.distanceTotal]);

  const startGame = () => {
    // Initialize audio context on user gesture
    audioManager.init();
    playSound('start');
    setGameState({ ...INITIAL_STATE, phase: GamePhase.TRAVEL });
  };

  const travel = async () => {
    if (loading) return;
    playSound('click');
    playSound('travel');
    setLoading(true);

    // 1. Consume Resources & Travel Distance (Base values)
    // 20km per day base. Food: 1kg per person per day.
    const aliveCrewCount = gameState.crew.filter(c => c.status !== '死亡').length;
    const foodConsumed = aliveCrewCount * 1.5; // 1.5kg per person
    
    setGameState(prev => {
      const newFood = Math.max(0, prev.food - foodConsumed);
      // Mood drops if starving
      const moodPenalty = newFood === 0 ? 20 : 0;
      
      return {
        ...prev,
        day: prev.day + 1,
        distanceTraveled: Math.min(prev.distanceTotal, prev.distanceTraveled + 25), // Travel 25km
        food: parseFloat(newFood.toFixed(1)),
        mood: Math.max(0, prev.mood - moodPenalty),
        phase: GamePhase.EVENT_GENERATION,
        logs: [...prev.logs, `第 ${prev.day + 1} 天: 前行 25km。消耗 ${foodConsumed}kg 食物。`]
      };
    });

    // 2. Generate Event
    const computedState = {
        ...gameState,
        day: gameState.day + 1,
        food: Math.max(0, gameState.food - foodConsumed),
        crew: gameState.crew
    };

    try {
      const event = await generateGameEvent(computedState);
      setGameState(prev => ({
        ...prev,
        currentEvent: event,
        phase: GamePhase.EVENT_DECISION
      }));
      playSound('event');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEventChoice = async (choiceId: string) => {
    playSound('click');
    setLoading(true);
    try {
      const resolution = await resolveGameEvent(gameState, choiceId);
      
      setGameState(prev => {
        const newCrew = [...prev.crew];
        
        // Apply crew changes
        resolution.crewStatusChanges.forEach(change => {
            if (newCrew[change.memberIndex]) {
                newCrew[change.memberIndex] = {
                    ...newCrew[change.memberIndex],
                    status: change.newStatus
                };
            }
        });

        return {
          ...prev,
          food: Math.max(0, parseFloat((prev.food + resolution.foodChange).toFixed(1))),
          mood: Math.min(100, Math.max(0, prev.mood + resolution.moodChange)),
          distanceTraveled: Math.min(prev.distanceTotal, Math.max(0, prev.distanceTraveled + resolution.distanceChange)),
          crew: newCrew,
          lastResolution: resolution,
          phase: GamePhase.EVENT_RESOLUTION,
          logs: [...prev.logs, `事件结果: ${resolution.outcomeText}`],
          currentEvent: null
        };
      });
      
      // Play sound based on outcome roughly
      if (resolution.moodChange < -10 || resolution.crewStatusChanges.some(c => c.newStatus === '死亡')) {
          playSound('failure');
      } else {
          playSound('success');
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const continueJourney = () => {
    playSound('click');
    setGameState(prev => ({ ...prev, phase: GamePhase.TRAVEL, lastResolution: null }));
  };

  // Renders
  if (gameState.phase === GamePhase.MENU) {
    return (
      <GameWrapper biome={gameState.biome} phase={gameState.phase}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="max-w-2xl animate-fade-in space-y-10 bg-black/60 p-16 rounded-lg backdrop-blur-md border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="space-y-2">
                <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-400 to-amber-700 tracking-tighter uppercase drop-shadow-sm">
                远行队传说
                </h1>
                <div className="h-1 w-32 bg-amber-600 mx-auto rounded-full"></div>
            </div>
            <p className="text-lg text-zinc-300 font-light tracking-widest uppercase font-mono">
              The Caravan Trail
            </p>
            <button 
              onClick={startGame}
              onMouseEnter={() => playSound('hover')}
              className="group relative px-12 py-5 bg-zinc-900 hover:bg-amber-950 text-white font-bold tracking-[0.3em] uppercase text-lg transition-all overflow-hidden border border-zinc-700 hover:border-amber-500 shadow-lg hover:shadow-amber-900/20"
            >
              <span className="relative z-10 group-hover:text-amber-100">INITIALIZE_JOURNEY</span>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-transparent transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out -z-0"></div>
            </button>
            
            {/* API Key Warning */}
            {!process.env.API_KEY && (
               <div className="bg-red-950/50 border border-red-800 p-4 text-red-300 text-xs font-mono mt-8">
                 [SYSTEM ERROR]: API_KEY NOT DETECTED. NARRATIVE ENGINE OFFLINE.
               </div>
            )}
          </div>
        </div>
      </GameWrapper>
    );
  }

  if (gameState.phase === GamePhase.GAME_OVER) {
    return (
      <GameWrapper biome={gameState.biome} phase={gameState.phase}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/80 backdrop-blur-md z-10">
          <h1 className="text-7xl font-bold text-red-600 mb-2 tracking-widest uppercase drop-shadow-[0_0_25px_rgba(220,38,38,0.8)]">MISSION FAILED</h1>
          <div className="text-zinc-500 text-sm font-mono mb-8 tracking-[0.5em]">SIGNAL LOST</div>
          
          <div className="max-w-md w-full text-left bg-zinc-950/90 border border-zinc-800 p-6 rounded mb-8 font-mono text-xs h-64 overflow-y-auto shadow-inner custom-scrollbar">
               {gameState.logs.slice().reverse().map((log, i) => (
                   <div key={i} className="mb-2 text-zinc-500 border-b border-zinc-900/50 pb-2 font-mono">
                       <span className="text-zinc-700 mr-2">[{gameState.logs.length - i}]</span>
                       {log}
                   </div>
               ))}
          </div>
          <button 
             onClick={() => { playSound('click'); setGameState(INITIAL_STATE); }} 
             onMouseEnter={() => playSound('hover')}
             className="px-10 py-4 border border-red-800 text-red-500 hover:bg-red-950/30 hover:text-red-400 transition-all uppercase tracking-widest font-bold text-sm"
          >
            Reboot System
          </button>
        </div>
      </GameWrapper>
    );
  }

  if (gameState.phase === GamePhase.VICTORY) {
     return (
      <GameWrapper biome={gameState.biome} phase={gameState.phase}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-emerald-950/90 backdrop-blur-md z-10">
          <h1 className="text-7xl font-bold text-emerald-400 mb-2 tracking-widest uppercase drop-shadow-[0_0_25px_rgba(52,211,153,0.5)]">EXTRACTION COMPLETE</h1>
          <p className="text-xl text-emerald-100 mb-12 font-mono border-b border-emerald-800 pb-4">Survivors: {gameState.crew.filter(c=>c.status!=='死亡').length} / 4</p>
          <button 
            onClick={() => { playSound('click'); setGameState(INITIAL_STATE); }}
            onMouseEnter={() => playSound('hover')} 
            className="px-10 py-4 border border-emerald-500 text-emerald-500 hover:bg-emerald-900/30 hover:text-emerald-300 transition-all uppercase tracking-widest font-bold text-sm"
          >
            New Operation
          </button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper biome={gameState.biome} phase={gameState.phase}>
      <ResourceBar state={gameState} />

      <main className="flex-1 container mx-auto max-w-7xl p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Panel: Log & Map Context - 3 cols */}
        <div className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-6">
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700 h-[400px] lg:h-auto lg:flex-1 flex flex-col rounded-sm shadow-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Logs</h3>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            </div>
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-2 text-zinc-400 custom-scrollbar bg-black/20">
              {gameState.logs.map((log, i) => (
                <div key={i} className="border-l border-zinc-700 pl-3 hover:text-zinc-200 transition-colors">
                  <span className="text-zinc-600 mr-2 select-none">T+{i}</span>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel: Main Action Area - 6 cols */}
        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col justify-start pt-10 lg:pt-20 min-h-[50vh]">
          {gameState.phase === GamePhase.TRAVEL && (
            <div className="text-center space-y-8 animate-fade-in">
              
              {/* Status Widget */}
              <div className="inline-block bg-black/40 backdrop-blur border border-white/5 px-8 py-6 rounded-lg">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight uppercase drop-shadow-lg mb-2 font-mono">{gameState.biome}</h2>
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-4"></div>
                <div className="text-amber-400/80 font-mono text-sm tracking-widest">
                    DISTANCE TO TARGET: <span className="text-white font-bold text-xl">{gameState.distanceTotal - gameState.distanceTraveled}</span> KM
                </div>
              </div>

              <div className="h-12"></div>

              <button
                onClick={travel}
                onMouseEnter={() => playSound('hover')}
                disabled={loading}
                className="group relative w-full max-w-md mx-auto py-6 bg-zinc-800/40 border border-zinc-600/50 hover:border-amber-500 hover:bg-zinc-900/60 text-zinc-200 font-bold text-xl uppercase tracking-[0.3em] transition-all shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] backdrop-blur-sm overflow-hidden rounded-sm"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      <span className="text-sm">Traversing...</span>
                    </>
                  ) : 'Forward (前进)'}
                </span>
                {!loading && (
                    <div className="absolute inset-0 bg-amber-500/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></div>
                )}
              </button>
            </div>
          )}

          {(gameState.phase === GamePhase.EVENT_GENERATION || gameState.phase === GamePhase.EVENT_DECISION) && gameState.currentEvent && (
            <EventCard 
              event={gameState.currentEvent} 
              onChoose={handleEventChoice} 
              loading={loading} 
            />
          )}

          {gameState.phase === GamePhase.EVENT_RESOLUTION && gameState.lastResolution && (
             <div className="bg-zinc-900/95 backdrop-blur border border-zinc-600/50 p-8 rounded-sm text-center animate-fade-in shadow-2xl max-w-2xl mx-auto ring-1 ring-white/5">
                <h2 className="text-xl font-bold text-zinc-400 mb-6 uppercase tracking-widest border-b border-zinc-800 pb-4">Outcome Report</h2>
                <p className="text-lg md:text-xl text-white mb-10 font-serif italic leading-relaxed px-6">
                  "{gameState.lastResolution.outcomeText}"
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                   {[
                       { label: 'Food', val: gameState.lastResolution.foodChange, color: gameState.lastResolution.foodChange >= 0 ? 'emerald' : 'red' },
                       { label: 'Mood', val: gameState.lastResolution.moodChange, color: gameState.lastResolution.moodChange >= 0 ? 'emerald' : 'red' },
                       { label: 'Dist', val: gameState.lastResolution.distanceChange, color: gameState.lastResolution.distanceChange >= 0 ? 'blue' : 'red' }
                   ].map((stat, i) => (
                       <div key={i} className={`flex flex-col items-center justify-center p-4 rounded bg-black/30 border border-white/5`}>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</span>
                          <span className={`font-mono text-2xl font-bold ${stat.color === 'emerald' ? 'text-emerald-400' : stat.color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                            {stat.val > 0 ? '+' : ''}{stat.val}
                          </span>
                       </div>
                   ))}
                </div>

                <button 
                  onClick={continueJourney}
                  onMouseEnter={() => playSound('hover')}
                  className="w-full py-4 bg-zinc-200 hover:bg-white text-zinc-900 font-bold uppercase transition-colors tracking-widest shadow-lg rounded-sm"
                >
                  Acknowledge
                </button>
             </div>
          )}
        </div>

        {/* Right Panel: Crew & Inventory - 3 cols */}
        <div className="lg:col-span-3 order-3 lg:order-3 space-y-6">
          <CrewPanel crew={gameState.crew} />
          
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700 p-5 rounded-sm shadow-lg">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-700 pb-2">Mission Parameters</h3>
            <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Rationing</span>
                    <span className="text-amber-500 bg-amber-900/20 px-2 py-1 rounded border border-amber-900/30">1.5kg / person</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Travel Rate</span>
                    <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded border border-blue-900/30">25km / cycle</span>
                </div>
                <div className="mt-4 p-3 bg-red-900/10 border border-red-900/30 rounded text-zinc-400 leading-relaxed">
                    <span className="text-red-400 font-bold block mb-1">WARNING:</span> 
                    Psychological stability is critical. Low mood leads to insanity.
                </div>
            </div>
          </div>
        </div>
      </main>
    </GameWrapper>
  );
}
