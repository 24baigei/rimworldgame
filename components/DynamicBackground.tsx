
import React, { useEffect, useRef } from 'react';
import { Biome, GamePhase } from '../types';

interface Props {
  biome: Biome;
  phase: GamePhase;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const DynamicBackground: React.FC<Props> = ({ biome, phase }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Get color palette based on biome
  const getPalette = (biome: Biome) => {
    switch (biome) {
      case Biome.EXTREME_DESERT:
        return { bg: '#1c100b', particles: '255, 100, 50' }; // Red/Orange
      case Biome.ICE_SHEET:
        return { bg: '#0f172a', particles: '200, 230, 255' }; // Blue/White
      case Biome.TROPICAL_RAINFOREST:
        return { bg: '#022c22', particles: '50, 255, 150' }; // Dark Green
      case Biome.TEMPERATE_FOREST:
        return { bg: '#1a2e1a', particles: '150, 200, 150' }; // Forest Green
      case Biome.ARID_SHRUBLAND:
      default:
        return { bg: '#271c19', particles: '210, 180, 140' }; // Dusty Brown
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 100;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 1 + 0.2,
          opacity: Math.random() * 0.5 + 0.1
        });
      }
    };

    const render = () => {
      const palette = getPalette(biome);
      
      // Clear with slight fade for trail effect (optional, but here we use solid clear for performance)
      // Instead of clearRect, we fill with the biome background color
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Determine global speed multiplier based on phase
      const isMoving = phase === GamePhase.TRAVEL;
      const speedMultiplier = isMoving ? 5 : 0.5;

      ctx.fillStyle = `rgba(${palette.particles}, 1)`;

      particles.forEach((p) => {
        // Move
        p.x -= p.speed * speedMultiplier;
        
        // Reset if off screen
        if (p.x < 0) {
          p.x = canvas.width;
          p.y = Math.random() * canvas.height;
        }

        // Draw
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Add a vignette effect
      const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/2, canvas.width/2, canvas.height/2, canvas.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();
    initParticles();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [biome, phase]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-colors duration-1000"
    />
  );
};

export default DynamicBackground;
