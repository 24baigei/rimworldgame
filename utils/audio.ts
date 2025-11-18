import { Biome, GamePhase } from '../types';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Ambience Nodes
  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  // State tracking
  private isInitialized: boolean = false;
  private currentBiome: Biome | null = null;
  private currentPhase: GamePhase | null = null;

  constructor() {
    // Lazy init in play/start methods to respect browser autoplay policy
  }

  public init() {
    if (this.isInitialized) {
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      return;
    }

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4; // Master Volume
    this.masterGain.connect(this.ctx.destination);

    this.startAmbience();
    this.isInitialized = true;
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("No Audio Context");
    const bufferSize = this.ctx.sampleRate * 4; // 4 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // White noise
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startAmbience() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // --- Wind Engine ---
    // White noise through a filter to simulate wind/atmosphere
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.01, now); 
    this.windGain.connect(this.masterGain);

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(400, now);
    this.windFilter.connect(this.windGain);

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = this.createNoiseBuffer();
    this.windNode.loop = true;
    this.windNode.connect(this.windFilter);
    this.windNode.start(now);

    // --- Drone Engine (Ship/Tech Hum) ---
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, now); // Start silent
    this.droneGain.connect(this.masterGain);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(120, now);
    this.droneFilter.connect(this.droneGain);

    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth'; // Richer texture
    this.droneOsc.frequency.setValueAtTime(50, now);
    this.droneOsc.connect(this.droneFilter);
    this.droneOsc.start(now);
  }

  public updateAmbience(biome: Biome, phase: GamePhase) {
    if (!this.ctx || !this.windFilter || !this.windGain || !this.droneGain || !this.droneOsc || !this.droneFilter) return;
    if (this.currentBiome === biome && this.currentPhase === phase) return;

    const now = this.ctx.currentTime;
    const rampTime = 2.0; // Smooth transitions

    // --- Update Wind based on Biome ---
    let targetWindFreq = 400;
    let targetWindQ = 1;
    let targetWindVol = 0.05;

    switch (biome) {
      case Biome.ICE_SHEET:
        targetWindFreq = 800; // Higher pitch, whistling
        targetWindQ = 5; // Whistling resonance
        targetWindVol = 0.08;
        break;
      case Biome.EXTREME_DESERT:
        targetWindFreq = 200; // Deep rumble
        targetWindQ = 0.5;
        targetWindVol = 0.06;
        break;
      case Biome.TROPICAL_RAINFOREST:
        targetWindFreq = 1200; // Hissing rain/leaves
        targetWindQ = 0.1;
        targetWindVol = 0.04;
        break;
      case Biome.ARID_SHRUBLAND:
      default:
        targetWindFreq = 350;
        targetWindQ = 1;
        targetWindVol = 0.05;
        break;
    }

    if (phase === GamePhase.MENU) {
        targetWindVol = 0.02; // Quiet in menu
    }

    this.windFilter.frequency.exponentialRampToValueAtTime(targetWindFreq, now + rampTime);
    this.windFilter.Q.linearRampToValueAtTime(targetWindQ, now + rampTime);
    this.windGain.gain.linearRampToValueAtTime(targetWindVol, now + rampTime);


    // --- Update Drone based on Phase ---
    let targetDroneVol = 0;
    let targetDroneFreq = 50;
    
    switch (phase) {
        case GamePhase.MENU:
            targetDroneVol = 0.05; // Subtle hum
            targetDroneFreq = 40;
            break;
        case GamePhase.TRAVEL:
            targetDroneVol = 0.15; // Loud engine
            targetDroneFreq = 80; // Higher pitch engine
            
            // Simulate engine throttle up
            this.droneOsc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
            break;
        case GamePhase.EVENT_GENERATION:
        case GamePhase.EVENT_DECISION:
            targetDroneVol = 0.02; // Quiet for reading
            targetDroneFreq = 45;
            this.droneOsc.frequency.linearRampToValueAtTime(45, now + 0.5);
            break;
        case GamePhase.GAME_OVER:
            targetDroneVol = 0.1;
            targetDroneFreq = 30; // Low ominous
            break;
        default:
            targetDroneVol = 0.03;
            targetDroneFreq = 50;
    }

    this.droneGain.gain.linearRampToValueAtTime(targetDroneVol, now + rampTime);
    this.droneFilter.frequency.linearRampToValueAtTime(targetDroneFreq * 2, now + rampTime); // Filter follows pitch roughly

    this.currentBiome = biome;
    this.currentPhase = phase;
  }

  public playSfx(type: 'click' | 'hover' | 'travel' | 'event' | 'success' | 'failure' | 'start') {
    if (!this.ctx || !this.masterGain) {
        // Try to init if called (e.g. start button)
        this.init();
    }
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    switch (type) {
      case 'hover':
        // Tech chirp
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.05); // Sharp drop
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'click':
        // Mechanical latch
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'start':
        // Power up
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 1.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);
        osc.start(now);
        osc.stop(now + 2.0);
        break;

      case 'event':
        // Alarm
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        // Dual tone for dissonance
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(450, now); // Detuned
        osc2.connect(gain);
        osc2.start(now);
        osc2.stop(now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case 'success':
        // Major triad arpeggio
        const notes = [523.25, 659.25, 783.99]; // C Major
        notes.forEach((freq, i) => {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(this.masterGain!);
          g.gain.setValueAtTime(0.05, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.8);
        });
        break;

      case 'failure':
        // Descending tones
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'travel':
         // Short burst of noise to signify movement start, complementing the drone
         const tBuffer = this.createNoiseBuffer();
         const tNode = this.ctx.createBufferSource();
         tNode.buffer = tBuffer;
         const tFilter = this.ctx.createBiquadFilter();
         tFilter.type = 'lowpass';
         tFilter.frequency.setValueAtTime(100, now);
         tFilter.frequency.linearRampToValueAtTime(500, now + 0.5);
         const tGain = this.ctx.createGain();
         tGain.gain.setValueAtTime(0.2, now);
         tGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
         
         tNode.connect(tFilter);
         tFilter.connect(tGain);
         tGain.connect(this.masterGain);
         tNode.start(now);
         tNode.stop(now + 1.0);
         break;
    }
  }
}

export const audioManager = new AudioManager();
export const playSound = (type: Parameters<AudioManager['playSfx']>[0]) => audioManager.playSfx(type);
