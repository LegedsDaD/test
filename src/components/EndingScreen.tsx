import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Home, Moon, Star, Sparkles } from 'lucide-react';
import { audio } from '../audio/SoundManager';

interface EndingScreenProps {
  onRestart: () => void;
  onBackToMenu: () => void;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({ onRestart, onBackToMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [textStage, setTextStage] = useState(0);

  // Poetic ending texts adhering perfectly to the redesigned sequence
  const endingTexts = [
    "You reach the ancient Eclipse Gate. The world is overwhelmingly bright...",
    "Nearly all shadows have vanished into the blinding white zenith.",
    "The Gate activates in breathless silence.",
    "The Moon glides into perfect alignment. A magnificent eclipse begins.",
    "Darkness returns. Stars emerge, and long shadows stretch across the recovering earth.",
    "Even the Longest Day Must End."
  ];

  useEffect(() => {
    // 1. SILENCE: Stop normal music instantly upon entering the ending screen
    audio.stopMusic();

    // Increment text stage slowly to match the celestial animation
    const timers: any[] = [];
    endingTexts.forEach((_, idx) => {
      const t = setTimeout(() => {
        setTextStage(idx + 1);
        // Trigger dramatic music swell when the eclipse begins spreading darkness
        if (idx === 3) {
          audio.playVictory();
        }
      }, 3500 * idx + 2000);
      timers.push(t);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

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

    // Star fields
    const stars: { x: number; y: number; size: number; maxAlpha: number; phase: number; speed: number }[] = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.8,
        size: 0.8 + Math.random() * 2.0,
        maxAlpha: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.025
      });
    }

    // Shadow embers and recovering nature glowing motes
    const embers: { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number }[] = [];

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // 1. SKY TRANSITION: From overwhelmingly bright white/yellow to deep eclipse black/violet
      const eclipseProgress = Math.min(1, Math.max(0, (time - 60) / 420)); // Starts after 1 sec, completes over 7 secs

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      
      // Top color: 255,250,220 (blinding white-yellow) -> 10,6,28 (deep space violet)
      const r1 = Math.round(255 - 245 * eclipseProgress);
      const g1 = Math.round(250 - 244 * eclipseProgress);
      const b1 = Math.round(220 - 192 * eclipseProgress);
      
      // Middle color: 255,235,160 -> 24,16,55
      const r2 = Math.round(255 - 231 * eclipseProgress);
      const g2 = Math.round(235 - 219 * eclipseProgress);
      const b2 = Math.round(160 - 105 * eclipseProgress);

      // Bottom color: 250,200,100 -> 35,15,45
      const r3 = Math.round(250 - 215 * eclipseProgress);
      const g3 = Math.round(200 - 185 * eclipseProgress);
      const b3 = Math.round(100 - 55 * eclipseProgress);

      skyGrad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
      skyGrad.addColorStop(0.5, `rgb(${r2}, ${g2}, ${b2})`);
      skyGrad.addColorStop(1, `rgb(${r3}, ${g3}, ${b3})`);
      
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. STARS LIGHTING UP
      if (eclipseProgress > 0.3) {
        ctx.save();
        const starsAlpha = (eclipseProgress - 0.3) / 0.7;
        stars.forEach(s => {
          const alpha = s.maxAlpha * starsAlpha * (0.5 + Math.sin(time * s.speed + s.phase) * 0.5);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 3. CELESTIAL ECLIPSE ANIMATION
      const sunX = w / 2;
      const sunY = h * 0.35;
      
      ctx.save();
      
      // Corona flare
      if (eclipseProgress > 0.1) {
        const coronaStrength = (eclipseProgress - 0.1) / 0.9;
        const numCoronaRays = 16;
        ctx.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < numCoronaRays; i++) {
          const angle = i * (Math.PI * 2 / numCoronaRays) + time * 0.002;
          const rayLength = 110 + Math.sin(time * 0.03 + i) * 20 * coronaStrength;
          const rayW = 0.15;
          
          const p1x = sunX + Math.cos(angle - rayW) * rayLength;
          const p1y = sunY + Math.sin(angle - rayW) * rayLength;
          const p2x = sunX + Math.cos(angle + rayW) * rayLength;
          const p2y = sunY + Math.sin(angle + rayW) * rayLength;

          const grad = ctx.createRadialGradient(sunX, sunY, 25, sunX, sunY, rayLength);
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.55 * coronaStrength})`);
          grad.addColorStop(0.4, `rgba(147, 51, 234, ${0.25 * coronaStrength})`); // Purple
          grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(sunX, sunY);
          ctx.lineTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // Sun glow
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 70 - 35 * eclipseProgress);
      sunGlow.addColorStop(0, '#ffffff');
      sunGlow.addColorStop(0.3, `rgba(255, 255, 255, ${1 - eclipseProgress * 0.4})`);
      sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70 - 20 * eclipseProgress, 0, Math.PI * 2);
      ctx.fill();

      // Moon sliding in to create the giant eclipse
      const moonOffset = 160 * (1 - eclipseProgress);
      const moonX = sunX - moonOffset;
      const moonY = sunY;

      ctx.beginPath();
      ctx.arc(moonX, moonY, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#05030a'; // Pitch dark moon
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15 * eclipseProgress;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Diamond ring effect at peak eclipse
      if (eclipseProgress > 0.95) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, 36.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
        
        // Brilliant diamond spark
        const sparkX = sunX + Math.cos(-0.5) * 36;
        const sparkY = sunY + Math.sin(-0.5) * 36;
        const sparkGrad = ctx.createRadialGradient(sparkX, sparkY, 1, sparkX, sparkY, 25);
        sparkGrad.addColorStop(0, '#ffffff');
        sparkGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
        sparkGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sparkGrad;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // 4. ENVIRONMENT RECOVERY & STRETCHING SHADOWS
      ctx.save();

      // Far Mountains (transforming from bright burnt orange to deep lush twilight violet/green)
      const mr1 = Math.round(180 - 165 * eclipseProgress);
      const mg1 = Math.round(120 - 105 * eclipseProgress);
      const mb1 = Math.round(50 + 10 * eclipseProgress);
      ctx.fillStyle = `rgb(${mr1}, ${mg1}, ${mb1})`;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 150) {
        const y = h * 0.62 + Math.sin(x * 0.001) * 60;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Near Mountains / Recovering Forest Line
      // As eclipse completes, beautiful rich emerald/teal tones emerge in the silhouette
      const mr2 = Math.round(120 - 110 * eclipseProgress);
      const mg2 = Math.round(80 - 60 * eclipseProgress);
      const mb2 = Math.round(30 + 15 * eclipseProgress);
      ctx.fillStyle = `rgb(${mr2}, ${mg2}, ${mb2})`;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 80) {
        const y = h * 0.72 + Math.sin(x * 0.0035) * 40 + Math.cos(x * 0.001) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // The Eclipse Gate silhouette at the center of the horizon
      const gateW = 80;
      const gateH = 110;
      const gateX = w / 2 - gateW / 2;
      const gateY = h * 0.71;

      ctx.fillStyle = '#030206';
      ctx.fillRect(gateX, gateY, 12, gateH);
      ctx.fillRect(gateX + gateW - 12, gateY, 12, gateH);
      ctx.fillRect(gateX - 6, gateY, gateW + 12, 18);

      // Long stretching shadows spreading across the world
      if (eclipseProgress > 0.4) {
        const shadowAlpha = 0.6 * (eclipseProgress - 0.4) / 0.6;
        ctx.fillStyle = `rgba(3, 2, 8, ${shadowAlpha})`;
        
        // Left shadow stretching out
        ctx.beginPath();
        ctx.moveTo(gateX, gateY + gateH);
        ctx.lineTo(gateX + 12, gateY + gateH);
        ctx.lineTo(gateX - 300, h);
        ctx.lineTo(gateX - 450, h);
        ctx.closePath();
        ctx.fill();

        // Right shadow stretching out
        ctx.beginPath();
        ctx.moveTo(gateX + gateW - 12, gateY + gateH);
        ctx.lineTo(gateX + gateW, gateY + gateH);
        ctx.lineTo(gateX + gateW + 450, h);
        ctx.lineTo(gateX + gateW + 300, h);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // 5. FLOATING RECOVERY MOTES & EMBERS
      if (time % 6 === 0 && embers.length < 60) {
        embers.push({
          x: w / 2 + (Math.random() - 0.5) * 100,
          y: h * 0.75,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 3,
          size: 2 + Math.random() * 4,
          color: Math.random() > 0.4 ? '#10b981' : '#a855f7', // Emerald green & twilight purple
          life: 0,
          maxLife: 160 + Math.random() * 100
        });
      }

      embers.forEach((emb, idx) => {
        emb.x += emb.vx;
        emb.y += emb.vy;
        emb.life++;
        
        const alpha = 1 - (emb.life / emb.maxLife);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = emb.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = emb.color;
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (emb.life >= emb.maxLife) {
          embers.splice(idx, 1);
        }
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-between overflow-hidden text-white select-none font-sans">
      {/* Cinematic Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Atmospheric Fog */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none z-0" />

      {/* Top Badge */}
      <div className="z-10 mt-10 animate-fade-in flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-purple-500/30 backdrop-blur-md text-xs font-semibold uppercase tracking-widest text-cyan-300 shadow-md">
          <Moon className="w-3.5 h-3.5 animate-pulse text-purple-400" />
          <span>Solstice Equilibrium Restored</span>
        </div>
      </div>

      {/* Poetic Narrative Overlay */}
      <div className="z-10 max-w-xl w-[90%] px-6 text-center flex flex-col gap-6 my-auto bg-slate-950/45 p-8 rounded-2xl border border-indigo-950/40 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-4">
          {endingTexts.map((text, idx) => {
            const isVisible = textStage > idx;
            const isLast = idx === endingTexts.length - 1;

            return (
              <p
                key={idx}
                className={`transition-all duration-1000 transform ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4 pointer-events-none'
                } ${
                  isLast 
                    ? 'text-xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400 tracking-widest font-serif uppercase pt-4 shadow-sm' 
                    : 'text-xs md:text-sm text-slate-200 leading-relaxed font-serif italic'
                }`}
              >
                {isLast ? `"${text}"` : text}
              </p>
            );
          })}
        </div>

        {/* Action Controls (Only show when final text has loaded) */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center mt-6 transition-all duration-1000 ${
            textStage >= endingTexts.length 
              ? 'opacity-100 translate-y-0 pointer-events-auto' 
              : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <button
            onClick={onRestart}
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(147,51,234,0.5)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
          
          <button
            onClick={onBackToMenu}
            className="px-6 py-3.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition active:scale-95"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>

      {/* Footer Credits */}
      <div
        className={`z-10 pb-8 text-center text-[10px] text-slate-400 tracking-widest transition-opacity duration-1000 ${
          textStage >= endingTexts.length ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="flex items-center justify-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" />
          Thank you for playing
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        </p>
      </div>
    </div>
  );
};
