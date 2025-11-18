export enum GamePhase {
  MENU = 'MENU',
  TRAVEL = 'TRAVEL',
  EVENT_GENERATION = 'EVENT_GENERATION',
  EVENT_DECISION = 'EVENT_DECISION',
  EVENT_RESOLUTION = 'EVENT_RESOLUTION',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum Biome {
  ARID_SHRUBLAND = '干旱灌木林',
  TEMPERATE_FOREST = '温带森林',
  ICE_SHEET = '大冰盖',
  EXTREME_DESERT = '极端沙漠',
  TROPICAL_RAINFOREST = '热带雨林'
}

export interface CrewMember {
  id: string;
  name: string;
  role: '领队' | '医生' | '战士' | '厨师';
  status: '健康' | '受伤' | '死亡' | '饥饿';
}

export interface GameState {
  phase: GamePhase;
  day: number;
  distanceTraveled: number;
  distanceTotal: number;
  food: number; // Pemmican
  mood: number; // 0-100
  credits: number; // Silver
  crew: CrewMember[];
  biome: Biome;
  logs: string[];
  currentEvent: GameEvent | null;
  lastResolution: EventResolution | null;
}

export interface Choice {
  id: string;
  text: string;
  type: 'aggressive' | 'diplomatic' | 'sacrifice' | 'neutral';
  riskLabel: string; // e.g. "高风险", "安全", "不道德"
}

export interface GameEvent {
  title: string;
  description: string;
  imageUrl?: string;
  choices: Choice[];
}

export interface EventResolution {
  outcomeText: string;
  foodChange: number;
  moodChange: number;
  distanceChange: number;
  crewStatusChanges: {
    memberIndex: number;
    newStatus: '健康' | '受伤' | '死亡' | '饥饿';
  }[];
}