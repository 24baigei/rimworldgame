import React from 'react';
import { CrewMember } from '../types';

interface Props {
  crew: CrewMember[];
}

const CrewPanel: React.FC<Props> = ({ crew }) => {
  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 p-0 rounded-sm overflow-hidden shadow-lg">
      <div className="bg-zinc-800/50 p-3 border-b border-zinc-700 flex justify-between items-center">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">队伍状态 (Roster)</h3>
          <span className="text-[10px] font-mono text-zinc-600">LIVE FEED</span>
      </div>
      
      <div className="divide-y divide-zinc-800/50">
        {crew.map((member) => {
          const style = getStatusStyles(member.status);
          return (
            <div 
              key={member.id} 
              className={`p-3 group transition-colors hover:bg-white/5 ${member.status === '死亡' ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    {/* Avatar Placeholder */}
                    <div className={`w-8 h-8 rounded bg-gradient-to-br ${style.avatarGradient} flex items-center justify-center border border-white/10 text-xs font-bold text-white shadow-inner`}>
                        {member.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-sm text-zinc-200 leading-tight">{member.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{member.role}</div>
                    </div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                  {member.status}
                </div>
              </div>
              
              {/* Status Bar - Simulated Health */}
              <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800/50">
                <div 
                    className={`h-full ${style.barColor} transition-all duration-500`} 
                    style={{ width: getStatusHealth(member.status) }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getStatusHealth = (status: CrewMember['status']) => {
    switch (status) {
        case '健康': return '100%';
        case '受伤': return '45%';
        case '饥饿': return '30%';
        case '死亡': return '0%';
        default: return '100%';
    }
};

const getStatusStyles = (status: CrewMember['status']) => {
  switch (status) {
    case '健康': return {
        avatarGradient: 'from-emerald-800 to-emerald-600',
        badge: 'bg-emerald-900/20 border-emerald-800 text-emerald-400',
        barColor: 'bg-emerald-500'
    };
    case '受伤': return {
        avatarGradient: 'from-orange-800 to-orange-600',
        badge: 'bg-orange-900/20 border-orange-800 text-orange-400',
        barColor: 'bg-orange-500'
    };
    case '饥饿': return {
        avatarGradient: 'from-red-800 to-red-600',
        badge: 'bg-red-900/20 border-red-800 text-red-400',
        barColor: 'bg-red-500 animate-pulse'
    };
    case '死亡': return {
        avatarGradient: 'from-zinc-800 to-zinc-700',
        badge: 'bg-zinc-900 border-zinc-800 text-zinc-500',
        barColor: 'bg-zinc-800'
    };
    default: return {
        avatarGradient: 'from-zinc-700 to-zinc-600',
        badge: 'text-zinc-400',
        barColor: 'bg-zinc-500'
    };
  }
};

export default CrewPanel;