import React from 'react';
import { X, Volume2, VolumeX, Sliders, AudioLines, Sparkles } from 'lucide-react';

interface SettingsOverlayProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onClose: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in pointer-events-auto select-none">
      <div className="bg-slate-900/98 border border-indigo-900/50 rounded-2xl max-w-md w-full shadow-2xl flex flex-col p-6 text-slate-200 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950/80 border border-slate-800 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 border-b border-indigo-950 pb-4 mb-6">
          <Sliders className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-lg font-extrabold font-serif tracking-wider text-white uppercase">
              Solstice Settings
            </h2>
            <p className="text-[10px] text-cyan-300 uppercase tracking-widest font-mono">
              Optimize Light & Sound
            </p>
          </div>
        </div>

        {/* Settings Body */}
        <div className="flex flex-col gap-6">
          
          {/* Sound Settings */}
          <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900 shadow-inner">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                Master Audio
              </span>
              <span className="font-mono text-indigo-350">{isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={onMuteToggle}
                className={`text-xs px-3 py-1.5 border rounded-lg transition font-semibold tracking-wide ${
                  isMuted 
                    ? 'bg-red-950/30 border-red-800/65 text-red-300 hover:bg-red-900/40' 
                    : 'bg-slate-900 border-indigo-950 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isMuted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                disabled={isMuted}
              />
            </div>
          </div>

          {/* Technical Audio Showcase Info */}
          <div className="bg-indigo-950/15 p-4 rounded-xl border border-indigo-950/30 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-indigo-350 text-xs font-bold uppercase tracking-wider">
              <AudioLines className="w-4 h-4 text-purple-400" />
              <span>Procedural Audio Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              All sound effects and music in <strong>Longest Day, Shortest Shadow</strong> are synthesized programmatically in real time using the browser's <strong>Web Audio API</strong>. This includes the evolving ambient pentatonic piano cords, low synth pads, and sizzling sunlight damage sizzles. No external media file downloads are used!
            </p>
          </div>

          {/* Accessibility Info */}
          <div className="flex gap-2.5 items-start text-[11px] text-slate-450 leading-relaxed bg-slate-950/25 p-3 rounded-lg border border-slate-950">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Responsive Gameplay:</strong> Supports both desktop keyboard input and automatically adapts to mobile touch joysticks/action buttons on smartphones or tablets.
            </span>
          </div>

        </div>

        {/* Return Button */}
        <button
          onClick={onClose}
          className="w-full mt-8 py-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] text-white font-bold rounded-xl transition text-xs uppercase tracking-wider shadow-lg"
        >
          Confirm Settings
        </button>

      </div>
    </div>
  );
};
