import React from 'react';
import { X, Keyboard, Smartphone, Zap, Sun, ShieldAlert, KeyRound, CornerDownRight } from 'lucide-react';

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
      <div className="bg-slate-900/98 border border-indigo-900/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col p-6 md:p-8 text-slate-200 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950/80 border border-slate-800 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 border-b border-indigo-950 pb-4 mb-6">
          <Sun className="w-7 h-7 text-amber-400 animate-spin-slow" />
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold font-serif tracking-wider text-white uppercase">
              Ascent Manual
            </h2>
            <p className="text-[11px] text-cyan-300 uppercase tracking-widest font-mono">
              Surviving the Longest Day, Shortest Shadow
            </p>
          </div>
        </div>

        {/* Content Tabs / Grid */}
        <div className="flex flex-col gap-6 text-sm">
          
          {/* Poetic Narrative Section */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-indigo-950/20">
            <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-1">The Solstice Prophecy</h3>
            <p className="text-xs text-slate-350 leading-relaxed font-serif italic">
              "Every year on the June Solstice, the light climbs higher, hungering for the deep. The safe shadowed spaces shrink to nothing. You are a living shadow, a remnant of the cool quiet night. If you do not reach the summit and activate the Eclipse Gate before the sun reaches its absolute zenith, your kind will dissipate into the scorching heat forever."
            </p>
          </div>

          {/* Core Gameplay Mechanics */}
          <div>
            <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Core Mechanics & HUD
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800/40 flex flex-col gap-1">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Sunlight Burns
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Stepping into the light rapidly drains your Shadow Essence. Return to shadows to regenerate.
                </p>
              </div>
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800/40 flex flex-col gap-1">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Shadow Dash
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Consume 30 Essence to dash across sunlit gaps. You are invulnerable to light while dashing!
                </p>
              </div>
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800/40 flex flex-col gap-1">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  Teleport Nodes
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  In Level 3+, look for swirling dark spheres in the sky. Press E to teleport to them instantly!
                </p>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-indigo-950/40">
            
            {/* Keyboard Controls */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                <Keyboard className="w-4 h-4" />
                Desktop Keyboard
              </h3>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Move Left / Right</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-white shadow-sm font-mono">A / D or ← / →</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Jump / Wall Jump</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-white shadow-sm font-mono">Space or W or ↑</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Shadow Dash</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-white shadow-sm font-mono">Shift</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Teleport to Node</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-white shadow-sm font-mono">E</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Pause Menu</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-white shadow-sm font-mono">Esc</kbd>
                </div>
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Mobile Touch Controls
              </h3>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Move Left / Right</span>
                  <span className="text-xs text-white font-medium flex items-center gap-1 font-sans">
                    Virtual Joystick <CornerDownRight className="w-3 h-3 text-indigo-400" />
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Jump</span>
                  <span className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-900 rounded text-xs font-bold text-indigo-200">JUMP Button</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Shadow Dash</span>
                  <span className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-900 rounded text-xs font-bold text-indigo-200">DASH Button</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/35 px-3 py-2 rounded-lg border border-slate-900">
                  <span className="text-xs text-slate-400 font-mono">Shadow Teleport</span>
                  <span className="px-2 py-0.5 bg-purple-950/40 border border-purple-900 rounded text-xs font-bold text-purple-200">T-PORT Button</span>
                </div>
              </div>
            </div>

          </div>

          {/* Level Puzzles Info */}
          <div className="flex gap-3 bg-indigo-950/25 p-3 rounded-lg border border-indigo-950/45 text-xs text-slate-300 leading-relaxed mt-1">
            <KeyRound className="w-8 h-8 text-amber-300 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">Solve the June Solstice Puzzles:</span>
              <span>Wait for swaying branch shadows, rotate mirrors, and push blocks under solar beams to block harmful light and create safe pathways. Every puzzle is solvable by aligning light and shade. Good luck, little shadow!</span>
            </div>
          </div>

        </div>

        {/* Close Banner Button */}
        <button
          onClick={onClose}
          className="w-full mt-8 py-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] text-white font-bold rounded-xl transition text-xs uppercase tracking-wider shadow-lg"
        >
          Return to Ascension
        </button>

      </div>
    </div>
  );
};
