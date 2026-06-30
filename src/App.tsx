import { useState, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { EndingScreen } from './components/EndingScreen';
import { HelpOverlay } from './components/HelpOverlay';
import { SettingsOverlay } from './components/SettingsOverlay';
import { audio } from './audio/SoundManager';

type GamePhase = 'menu' | 'playing' | 'ending' | 'endless';

export default function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [levelIndex, setLevelIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [solsticeProgress, setSolsticeProgress] = useState<number>(0); // 0 = Dawn, 1 = Zenith

  // Sync state with audio manager
  useEffect(() => {
    // Attempt to initialize and set starting volume
    audio.setVolume(volume);
    if (isMuted) {
      // Keep in sync
      if (!audio.getIsMuted()) {
        audio.toggleMute();
      }
    }
  }, []);

  const handleStartGame = (index: number) => {
    // Initialize audio context on first interaction
    audio.resumeContext();
    setLevelIndex(index);
    setGamePhase('playing');
    setIsPaused(false);
    audio.startMusic();
    audio.setMusicIntensity(index / 4.0);
  };

  const handleLevelComplete = (nextIndex: number) => {
    if (nextIndex > 4) {
      // Completed all levels, transition to Ending
      setGamePhase('ending');
    } else {
      setLevelIndex(nextIndex);
      audio.setMusicIntensity(nextIndex / 4.0);
    }
  };

  const handleEndingTrigger = () => {
    setGamePhase('ending');
  };

  const handleStartEndless = () => {
    audio.resumeContext();
    setLevelIndex(99);
    setGamePhase('endless');
    setIsPaused(false);
    audio.startMusic();
    audio.setMusicIntensity(0.5);
  };

  const handleEndlessComplete = () => {
    audio.playVictory();
    setGamePhase('ending');
  };

  const handleBackToMenu = () => {
    audio.stopMusic();
    setGamePhase('menu');
    setIsPaused(false);
  };

  const handleRestart = () => {
    setGamePhase('playing');
    setLevelIndex(0);
    setIsPaused(false);
    audio.startMusic();
    audio.setMusicIntensity(0);
  };

  const handleMuteToggle = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleVolumeChange = (vol: number) => {
    audio.setVolume(vol);
    setVolume(vol);
    if (isMuted && vol > 0) {
      // Automatically unmute if setting volume
      audio.toggleMute();
      setIsMuted(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-white font-sans overflow-hidden select-none">
      
      {/* Main Game Menu */}
      {gamePhase === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onStartEndless={handleStartEndless}
          onOpenHelp={() => setShowHelp(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Active Game Session */}
      {(gamePhase === 'playing' || gamePhase === 'endless') && (
        <GameCanvas
          levelIndex={gamePhase === 'endless' ? 99 : levelIndex}
          isPaused={isPaused}
          onPauseToggle={setIsPaused}
          onLevelComplete={gamePhase === 'endless' ? handleEndlessComplete : handleLevelComplete}
          onBackToMenu={handleBackToMenu}
          onEndingTrigger={gamePhase === 'endless' ? handleEndlessComplete : handleEndingTrigger}
          volume={volume}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          onVolumeChange={handleVolumeChange}
          onOpenHelp={() => setShowHelp(true)}
          solsticeProgress={solsticeProgress}
          onSolsticeProgressUpdate={setSolsticeProgress}
          isEndless={gamePhase === 'endless'}
        />
      )}

      {/* Cinematic Ending */}
      {gamePhase === 'ending' && (
        <EndingScreen
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* Help Modal Overlay */}
      {showHelp && (
        <HelpOverlay
          onClose={() => setShowHelp(false)}
        />
      )}

      {/* Settings Modal Overlay */}
      {showSettings && (
        <SettingsOverlay
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
