import React, { useEffect, useRef } from 'react';
import { Play, BookOpen, Settings, Sun, Sparkles, Orbit } from 'lucide-react';
import { audio } from '../audio/SoundManager';

interface MainMenuProps {
  onStartGame: (levelIndex: number) => void;
  onStartEndless: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onStartEndless, onOpenHelp, onOpenSettings }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animated background for the main menu using Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Spawn menu particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; speed: number; phase: number }[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: -0.2 - Math.random() * 0.8,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 3,
        alpha: 0.2 + Math.random() * 0.4,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2
      });
    }

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Draw gorgeous Solstice sunset gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#110626'); // Midnight purple
      grad.addColorStop(0.4, '#1e1b4b'); // Deep indigo
      grad.addColorStop(0.7, '#6b21a8'); // Twilight violet
      grad.addColorStop(0.9, '#ca8a04'); // Solstice amber
      grad.addColorStop(1, '#ea580c'); // Sunfire orange
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw a giant rising Solstice Sun on the horizon
      const sunX = w * 0.8;
      const sunY = h * 0.75;
      
      // Giant sun glow layers
      const numLayers = 4;
      for (let i = numLayers; i > 0; i--) {
        const radius = 60 + i * 50 + Math.sin(time * 0.02 + i) * 10;
        const alpha = 0.08 / i;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, radius);
        sunGrad.addColorStop(0, `rgba(254, 240, 138, ${alpha * 8})`);
        sunGrad.addColorStop(0.4, `rgba(249, 115, 22, ${alpha * 3})`);
        sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw sun core
      ctx.beginPath();
      ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 40;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw subtle crepuscular light rays sweeping leftwards
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI + 0.25 + i * 0.12 + Math.sin(time * 0.005 + i) * 0.05;
        const rayW = 0.06 + Math.sin(time * 0.01 + i) * 0.01;
        const p1x = sunX + Math.cos(angle - rayW) * 3000;
        const p1y = sunY + Math.sin(angle - rayW) * 3000;
        const p2x = sunX + Math.cos(angle + rayW) * 3000;
        const p2y = sunY + Math.sin(angle + rayW) * 3000;

        const rayGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 1200);
        rayGrad.addColorStop(0, 'rgba(255, 243, 200, 0.12)');
        rayGrad.addColorStop(0.5, 'rgba(255, 243, 200, 0.04)');
        rayGrad.addColorStop(1, 'rgba(255, 243, 200, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Draw silhouetted mountains at the bottom
      ctx.fillStyle = 'rgba(13, 11, 23, 0.7)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 100) {
        const y = h * 0.72 + Math.sin(x * 0.001) * 60 + Math.cos(x * 0.0004) * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Nearer silhouetted mountain range
      ctx.fillStyle = '#0a0814';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 60) {
        const y = h * 0.79 + Math.sin(x * 0.003) * 30 + Math.cos(x * 0.001) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Draw and update drifting dark/light particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap particles
        if (p.x < -10) p.x = w + 10;
        if (p.y < -10 || p.y > h + 10) p.y = Math.random() * h;
        
        // Let size pulse slightly
        const size = p.size + Math.sin(time * p.speed + p.phase) * 0.8;
        const glow = Math.sin(time * 0.05 + p.phase) * 0.15;
        
        ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha + glow})`; // Glowing gold stars
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    audio.resumeContext();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const triggerAudioStart = () => {
    audio.resumeContext();
    audio.startMusic();
  };

  return (
    <div 
      className="relative w-full h-screen flex flex-col items-center justify-between overflow-hidden text-white select-none font-sans"
      onClick={triggerAudioStart}
    >
      {/* Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Atmospheric Fog Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90 pointer-events-none z-0" />

      {/* Header - Solstice Theme Badge */}
      <div className="z-10 mt-12 flex flex-col items-center gap-1 animate-fade-in pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/60 border border-amber-500/20 backdrop-blur-md text-xs font-semibold uppercase tracking-widest text-amber-300 shadow-md">
          <Sun className="w-3.5 h-3.5 animate-spin-slow text-amber-400" />
          <span>A June Solstice Narrative</span>
        </div>
      </div>

      {/* Main Title & Lore Intro */}
      <div className="z-10 flex flex-col items-center text-center max-w-2xl px-6 my-auto gap-6 animate-fade-in-delayed">
        
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl md:text-6xl font-extrabold font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] uppercase">
            Longest Day
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-amber-400/80" />
            <span className="text-xs md:text-sm font-light tracking-[0.4em] text-cyan-300 uppercase font-serif">
              Shortest Shadow
            </span>
            <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-amber-400/80" />
          </div>
        </div>

        {/* Poetic Prologue */}
        <p className="text-slate-300 text-xs md:text-sm italic leading-relaxed font-serif max-w-lg bg-slate-950/40 p-4 rounded-xl backdrop-blur-sm border border-white/5 shadow-inner">
          "The June Solstice has arrived. As the Sun climbs to its highest peak, shadows shrink across the world. You are a living shadow, fighting to survive. Reach the ancient Eclipse Gate before all darkness disappears forever."
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center items-center mt-2 pointer-events-auto">
          <button
            onClick={() => onStartGame(0)}
            className="w-full sm:w-52 py-3.5 bg-gradient-to-r from-amber-500 via-orange-600 to-amber-500 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(234,88,12,0.4)] hover:shadow-[0_4px_25px_rgba(234,88,12,0.6)] transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 tracking-wider uppercase text-xs"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Journey
          </button>
          
          <button
            onClick={onStartEndless}
            className="w-full sm:w-52 py-3.5 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(147,51,234,0.5)] hover:shadow-[0_4px_25px_rgba(147,51,234,0.7)] transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 tracking-wider uppercase text-xs"
          >
            <Play className="w-4 h-4 fill-current" />
            Endless Run
          </button>
          
          <button
            onClick={onOpenHelp}
            className="w-full sm:w-44 py-3.5 bg-slate-950/80 hover:bg-slate-900 border border-indigo-950 rounded-xl hover:border-indigo-900 text-xs text-slate-200 hover:text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            How to Play
          </button>
        </div>
      </div>

      {/* Level Select & Footer */}
      <div className="z-10 w-full max-w-4xl px-6 pb-10 flex flex-col items-center gap-6 animate-fade-in-delayed pointer-events-auto">
        
        {/* Level Select Grid */}
        <div className="w-full flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-200 uppercase tracking-widest">
            <Orbit className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
            <span>Select Region Ascent</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-2xl">
            {[
              { id: 0, name: "Meadow", num: "I", color: "border-emerald-900/50 hover:bg-emerald-950/20 text-emerald-300" },
              { id: 1, name: "Forest", num: "II", color: "border-sky-900/50 hover:bg-sky-950/20 text-sky-300" },
              { id: 2, name: "Cliffs", num: "III", color: "border-cyan-900/50 hover:bg-cyan-950/20 text-cyan-300" },
              { id: 3, name: "Desert", num: "IV", color: "border-amber-900/50 hover:bg-amber-950/20 text-amber-300" },
              { id: 4, name: "Summit", num: "V", color: "border-purple-900/50 hover:bg-purple-950/20 text-purple-300" }
            ].map(lvl => (
              <button
                key={lvl.id}
                onClick={() => onStartGame(lvl.id)}
                className={`py-2 border bg-slate-950/65 rounded-lg flex flex-col items-center justify-center transition hover:scale-105 shadow-md group ${lvl.color}`}
              >
                <span className="text-[10px] font-bold opacity-50 font-mono tracking-widest">{lvl.num}</span>
                <span className="text-xs font-bold font-serif tracking-wider group-hover:text-white">{lvl.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Utilities */}
        <div className="flex justify-between items-center w-full max-w-2xl border-t border-white/5 pt-4 text-[10px] text-slate-500 tracking-wider">
          <span>LONGEST DAY, SHORTEST SHADOW © 2026</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenSettings} 
              className="hover:text-slate-300 transition flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              Settings
            </button>
            <span className="flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              Solstice Jam
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
