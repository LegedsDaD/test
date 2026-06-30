import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, HelpCircle, Volume2, VolumeX, ArrowLeft, Zap, Orbit } from 'lucide-react';
import { audio } from '../audio/SoundManager';
import { LEVELS, Platform, MovingObject, LightBeam, ShadowNode, CollectibleOrb, Checkpoint, PushableBlock } from '../game/LevelData';

interface GameCanvasProps {
  levelIndex: number;
  isPaused: boolean;
  onPauseToggle: (paused: boolean) => void;
  onLevelComplete: (nextIndex: number) => void;
  onBackToMenu: () => void;
  onEndingTrigger: () => void;
  volume: number;
  isMuted: boolean;
  onMuteToggle: () => void;
  onVolumeChange: (vol: number) => void;
  onOpenHelp: () => void;
  solsticeProgress?: number; // 0.0 (Dawn) → 1.0 (Zenith)
  onSolsticeProgressUpdate?: (progress: number) => void;
  isEndless?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  levelIndex,
  isPaused,
  onPauseToggle,
  onLevelComplete,
  onBackToMenu,
  onEndingTrigger,
  volume,
  isMuted,
  onMuteToggle,
  onVolumeChange,
  onOpenHelp,
  solsticeProgress = 0,
  onSolsticeProgressUpdate,
  isEndless = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live refs for props/callbacks so the animation loop NEVER uses stale values.
  const levelIndexRef = useRef(levelIndex);
  const isPausedRef = useRef(isPaused);
  const isEndlessRef = useRef(isEndless);
  const solsticeProgressRef = useRef(solsticeProgress);
  const onLevelCompleteRef = useRef(onLevelComplete);
  const onEndingTriggerRef = useRef(onEndingTrigger);
  const onSolsticeProgressUpdateRef = useRef(onSolsticeProgressUpdate);

  // Keep all live refs synced on every render.
  levelIndexRef.current = levelIndex;
  isPausedRef.current = isPaused;
  isEndlessRef.current = isEndless;
  solsticeProgressRef.current = solsticeProgress;
  onLevelCompleteRef.current = onLevelComplete;
  onEndingTriggerRef.current = onEndingTrigger;
  onSolsticeProgressUpdateRef.current = onSolsticeProgressUpdate;
  
  // Game state refs (to avoid stale closures in requestAnimationFrame)
  const stateRef = useRef({
    // Player physics
    px: 100,
    py: 450,
    vx: 0,
    vy: 0,
    pw: 24,
    ph: 36,
    isGrounded: false,
    facingDir: 1, // 1 for right, -1 for left
    
    // Shadow Energy
    shadowEnergy: 100,
    maxShadowEnergy: 100,
    inShadow: true,
    
    // Checkpoints
    checkpointX: 100,
    checkpointY: 450,
    activeCheckpointId: '',
    
    // Special Abilities
    dashCooldown: 0,
    dashActive: false,
    dashTimer: 0,
    dashDir: { x: 1, y: 0 },
    
    // Teleportation
    selectedNode: null as ShadowNode | null,
    
    // Level & Elements (safe fallback to LEVELS[0] to avoid crash in endless mode where levelIndex=99)
    level: (LEVELS[levelIndex] || LEVELS[0]),
    platforms: [] as Platform[],
    movingObjects: [] as MovingObject[],
    lightBeams: [] as LightBeam[],
    shadowNodes: [] as ShadowNode[],
    orbs: [] as CollectibleOrb[],
    checkpoints: [] as Checkpoint[],
    pushableBlocks: [] as PushableBlock[],
    
    // World/Environment
    timeOfDay: 0, // 0 to 1, increases over time in level
    sunAngle: (LEVELS[levelIndex] || LEVELS[0]).sunAngle,
    sunIntensity: (LEVELS[levelIndex] || LEVELS[0]).sunIntensity,
    clouds: [] as { cx: number; cy: number; cw: number; ch: number; speed: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string; life: number; maxLife: number }[],
    
    // Camera
    camX: 0,
    camY: 0,
    
    // Controls
    keys: {
      a: false,
      d: false,
      ArrowLeft: false,
      ArrowRight: false,
      w: false,
      ArrowUp: false,
      Space: false,
      Shift: false,
      e: false,
    },
    
    // UI/VFX
    screenShake: 0,
    loreOverlayText: null as string | null,
    loreTimer: 0,
    deaths: 0,
    levelCompleted: false,
    transitionTimer: 0,
    gameTime: 0,
    // Spawn Protection & Animation timers
    protectionTimer: 180,
    teleportActive: false,
    teleportTimer: 0,
    teleportTarget: null as { x: number; y: number } | null,
    teleportFragments: [] as { x: number; y: number; vx: number; vy: number; size: number; color: string }[],
    jumpAnticipationTimer: 0,
    jumpPending: false,
    jumpPendingWallDir: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    jumpHeldLast: false,
    jumpCutAvailable: false,
    landingTimer: 0,
    lastIsGrounded: true,
    lastVy: 0,
    noonEventTriggered: false,
    screenFlash: 0,
    endlessDistance: 0,
    endlessDifficulty: 1,
    endlessCloudSpawnCounter: 0,
    // Soft visual trail behind the player for atmospheric motion
    trailPositions: [] as { x: number; y: number; age: number; scale: number; alpha: number; facing: number }[],
    // Ambient floating wisps around the character
    ambientWisps: [] as { x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number }[],
    // For breath wobble and random micro-seed
    microSeed: Math.random() * 1000,
    lastJumpSoundFrame: 0,
    lastLandSoundFrame: 0,
    blinkTimer: 0,
    isBlinking: false,
    blinkStartTime: 0,
  });

  // Mobile controls overlay state
  const [isMobile, setIsMobile] = useState(false);
  const [showLore, setShowLore] = useState<string | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Level State when levelIndex changes with validation
  useEffect(() => {
    const state = stateRef.current;
    
    // Level validation and fallback system
    let level: any;
    try {
      if (isEndless) {
        // Build a proper endless level from scratch with real starting platforms
        const endlessPlatforms: any[] = [];
        const endlessNodes: any[] = [];
        const endlessOrbs: any[] = [];
        const endlessCheckpoints: any[] = [];
        
        // Generate a solid starting area and initial platforms
        endlessPlatforms.push({ x: 0, y: 520, w: 800, h: 90, type: 'sand' });
        endlessCheckpoints.push({ id: "cp_e_0", x: 100, y: 500, activated: false });
        
        // Generate initial terrain so the player has somewhere to go
        for (let seg = 0; seg < 15; seg++) {
          const baseX = 900 + seg * 500;
          endlessPlatforms.push({ x: baseX, y: 520, w: 180 + Math.random() * 200, h: 90, type: 'sand' });
          endlessPlatforms.push({ x: baseX + 60, y: 370 + Math.random() * 80, w: 80 + Math.random() * 100, h: 35, type: 'ruins' });
          if (seg % 3 === 0) {
            endlessCheckpoints.push({ id: `cp_e_${seg}`, x: baseX + 80, y: 500, activated: false });
          }
          if (seg % 2 === 0) {
            endlessNodes.push({ id: `node_e_${seg}`, x: baseX + 100, y: 320, active: true });
          }
          if (seg % 4 === 0) {
            endlessOrbs.push({ id: `orb_e_${seg}`, x: baseX + 120, y: 310, collected: false, type: 'energy' });
          }
        }
        
        level = {
          id: 99,
          name: "Endless Solstice Run",
          regionName: "The Eternal Expanse",
          description: "Survive as long as you can.",
          width: 99999,
          height: 650,
          startX: 90,
          startY: 484,
          goalX: 99999,
          goalY: 500,
          sunAngle: 1.25,
          sunIntensity: 0.85,
          skyColors: ['#f39c12', '#d35400', '#2c3e50'],
          ambientDarkness: 0.1,
          platforms: endlessPlatforms,
          movingObjects: [],
          lightBeams: [],
          shadowNodes: endlessNodes,
          orbs: endlessOrbs,
          checkpoints: endlessCheckpoints,
          pushableBlocks: [],
        };
      } else {
        // Normal mode: validate level index
        const idx = Math.max(0, Math.min(4, levelIndex));
        level = LEVELS[idx];
      }
      
      // Validate critical level data
      if (!level || !level.platforms || level.platforms.length === 0) {
        console.error("Level validation failed, loading fallback");
        level = { ...LEVELS[0] };
      }
      
      // Ensure spawn point is valid
      if (!level.startX || !level.startY) {
        level.startX = 100;
        level.startY = 450;
      }
      
      // Ensure goal exists
      if (!level.goalX || !level.goalY) {
        level.goalX = 2000;
        level.goalY = 450;
      }
      
      // Ensure arrays exist
      if (!level.checkpoints || level.checkpoints.length === 0) {
        level.checkpoints = [{ id: "cp_fallback", x: level.startX + 200, y: level.startY, activated: false }];
      }
      if (!level.movingObjects) level.movingObjects = [];
      if (!level.lightBeams) level.lightBeams = [];
      if (!level.shadowNodes) level.shadowNodes = [];
      if (!level.orbs) level.orbs = [];
      if (!level.pushableBlocks) level.pushableBlocks = [];
      
    } catch (e) {
      console.error("Level initialization error:", e);
      level = { ...LEVELS[0] };
    }
    
    state.level = level;
    state.px = level.startX;
    state.py = level.startY;
    state.vx = 0;
    state.vy = 0;
    state.shadowEnergy = 100;
    state.inShadow = true;
    state.checkpointX = level.startX;
    state.checkpointY = level.startY;
    state.activeCheckpointId = '';
    state.protectionTimer = 180;
    state.teleportActive = false;
    state.teleportTimer = 0;
    state.jumpAnticipationTimer = 0;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    state.jumpHeldLast = false;
    state.jumpCutAvailable = false;
    state.landingTimer = 0;
    state.noonEventTriggered = false;
    state.screenFlash = 0.5;
    
    // Deep clone arrays with validation
    try {
      state.platforms = JSON.parse(JSON.stringify(level.platforms || []));
      state.movingObjects = JSON.parse(JSON.stringify(level.movingObjects || []));
      state.lightBeams = JSON.parse(JSON.stringify(level.lightBeams || []));
      state.shadowNodes = JSON.parse(JSON.stringify(level.shadowNodes || []));
      state.orbs = JSON.parse(JSON.stringify(level.orbs || []));
      state.checkpoints = JSON.parse(JSON.stringify(level.checkpoints || []));
      state.pushableBlocks = JSON.parse(JSON.stringify(level.pushableBlocks || []));
    } catch (e) {
      console.error("Level data clone error:", e);
      state.platforms = [];
      state.movingObjects = [];
      state.lightBeams = [];
      state.shadowNodes = [];
      state.orbs = [];
      state.checkpoints = [];
      state.pushableBlocks = [];
    }
    
    state.sunAngle = level.sunAngle || 0.5;
    state.sunIntensity = level.sunIntensity || 0.5;
    state.timeOfDay = 0;
    state.levelCompleted = false;
    state.transitionTimer = 0;
    state.particles = [];
    state.selectedNode = null;
    state.loreOverlayText = null;
    setShowLore(null);
    state.endlessDistance = 0;
    state.endlessDifficulty = 1;
    state.endlessCloudSpawnCounter = 0;

    // Create clouds for this level (different heights and positions)
    state.clouds = [];
    if (level.id === 4) {
      // Solstice Desert has specific moving clouds that cast shadows
      level.movingObjects.forEach((mo: any) => {
        if (mo.type === 'cloud') {
          state.clouds.push({
            cx: mo.startX,
            cy: mo.startY,
            cw: mo.w,
            ch: mo.h,
            speed: mo.speed
          });
        }
      });
    } else if (isEndless || level.id === 99) {
      // Endless mode: generate many shadow-casting clouds
      for (let i = 0; i < 12; i++) {
        state.clouds.push({
          cx: i * 600 + Math.random() * 300,
          cy: 35 + Math.random() * 50,
          cw: 180 + Math.random() * 180,
          ch: 25 + Math.random() * 12,
          speed: 0.6 + Math.random() * 1.0,
        });
      }
    } else {
      // Decorative clouds
      for (let i = 0; i < 5; i++) {
        state.clouds.push({
          cx: Math.random() * level.width,
          cy: 30 + Math.random() * 80,
          cw: 120 + Math.random() * 100,
          ch: 20 + Math.random() * 15,
          speed: 0.2 + Math.random() * 0.4,
        });
      }
    }

    // Audio triggers
    audio.startMusic();
    audio.startRegionAmbience(isEndless ? 3 : levelIndex);
    audio.setMusicIntensity(levelIndex / 4.0);

    // Initial camera position
    state.camX = state.px - 400;
    state.camY = state.py - 300;
  }, [levelIndex, isEndless]);

  // Handle Resize and Canvas Setup
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Set up inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      const key = e.key.toLowerCase();

      if (e.key === 'Escape' || e.key === 'Esc') {
        onPauseToggle(!isPaused);
        return;
      }
      if (key === 'h') {
        onOpenHelp();
        return;
      }

      if (key === 'a' || e.key === 'ArrowLeft') state.keys.a = true;
      if (key === 'd' || e.key === 'ArrowRight') state.keys.d = true;
      if (key === 'w' || e.key === 'ArrowUp') state.keys.w = true;
      if (e.key === ' ') {
        state.keys.Space = true;
        // Prevent scrolling space
        e.preventDefault();
      }
      if (e.key === 'Shift') {
        state.keys.Shift = true;
        e.preventDefault();
      }
      if (key === 'e') {
        state.keys.e = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const state = stateRef.current;
      const key = e.key.toLowerCase();

      if (key === 'a' || e.key === 'ArrowLeft') state.keys.a = false;
      if (key === 'd' || e.key === 'ArrowRight') state.keys.d = false;
      if (key === 'w' || e.key === 'ArrowUp') state.keys.w = false;
      if (e.key === ' ') state.keys.Space = false;
      if (e.key === 'Shift') state.keys.Shift = false;
      if (key === 'e') state.keys.e = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, onPauseToggle, onOpenHelp]);

  // Main Game Loop
  useEffect(() => {
    let animFrameId: number;
    
    const updateAndRender = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameId = requestAnimationFrame(updateAndRender);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameId = requestAnimationFrame(updateAndRender);
        return;
      }

      if (!isPausedRef.current && !stateRef.current.levelCompleted) {
        updateGame();
      }
      
      renderGame(ctx, canvas.width, canvas.height);
      
      animFrameId = requestAnimationFrame(updateAndRender);
    };

    animFrameId = requestAnimationFrame(updateAndRender);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  // POINT-IN-POLYGON ALGORITHM
  const isPointInPolygon = (p: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y))
          && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  };

  // Generate Shadow Polygons for all obstacles
  const getShadowPolygons = (state: any) => {
    const shadows: { x: number; y: number }[][] = [];
    const Y_max = state.level.height + 200; // Far below the screen
    
    // Calculate light direction vector from sun angle
    // Sun angle of 0.5 = morning (dx positive, dy positive, shadow points down-right)
    // Sun angle of 1.5 = noon (dx close to 0, dy positive, shadow points straight down)
    const dx = Math.cos(state.sunAngle);
    const dy = Math.sin(state.sunAngle);

    // 1. Shadows from static platforms
    state.platforms.forEach((p: Platform) => {
      // Invisible tutorial or trigger labels don't cast shadows
      if (p.w === 0 || p.h === 0) return;
      
      // Calculate the shadow quadrilateral of the block
      // We project the top edge and/or side edges based on the sign of dx
      const shadowPoly: { x: number; y: number }[] = [];
      
      if (dx >= 0) {
        // Light shining down-right: shadow goes down-right
        // Top-left and bottom-right are extreme vertices
        shadowPoly.push({ x: p.x, y: p.y });
        shadowPoly.push({ x: p.x + p.w, y: p.y });
        shadowPoly.push({ x: p.x + p.w, y: p.y + p.h });
        // Projection of bottom-right
        shadowPoly.push({ x: p.x + p.w + (Y_max - (p.y + p.h)) * dx / dy, y: Y_max });
        // Projection of top-left
        shadowPoly.push({ x: p.x + (Y_max - p.y) * dx / dy, y: Y_max });
      } else {
        // Light shining down-left: shadow goes down-left
        // Top-right and bottom-left are extreme vertices
        shadowPoly.push({ x: p.x + p.w, y: p.y });
        shadowPoly.push({ x: p.x, y: p.y });
        shadowPoly.push({ x: p.x, y: p.y + p.h });
        // Projection of bottom-left
        shadowPoly.push({ x: p.x + (Y_max - (p.y + p.h)) * dx / dy, y: Y_max });
        // Projection of top-right
        shadowPoly.push({ x: p.x + p.w + (Y_max - p.y) * dx / dy, y: Y_max });
      }
      
      shadows.push(shadowPoly);
    });

    // 2. Shadows from pushable blocks
    state.pushableBlocks.forEach((b: PushableBlock) => {
      const shadowPoly: { x: number; y: number }[] = [];
      if (dx >= 0) {
        shadowPoly.push({ x: b.x, y: b.y });
        shadowPoly.push({ x: b.x + b.w, y: b.y });
        shadowPoly.push({ x: b.x + b.w, y: b.y + b.h });
        shadowPoly.push({ x: b.x + b.w + (Y_max - (b.y + b.h)) * dx / dy, y: Y_max });
        shadowPoly.push({ x: b.x + (Y_max - b.y) * dx / dy, y: Y_max });
      } else {
        shadowPoly.push({ x: b.x + b.w, y: b.y });
        shadowPoly.push({ x: b.x, y: b.y });
        shadowPoly.push({ x: b.x, y: b.y + b.h });
        shadowPoly.push({ x: b.x + (Y_max - (b.y + b.h)) * dx / dy, y: Y_max });
        shadowPoly.push({ x: b.x + b.w + (Y_max - b.y) * dx / dy, y: Y_max });
      }
      shadows.push(shadowPoly);
    });

    // 3. Shadows from moving objects (branches, spinning bars)
    state.movingObjects.forEach((mo: MovingObject) => {
      if (mo.type === 'branch' || mo.type === 'elevator') {
        // Calculate the current positions of the moving platform
        const mx = mo.startX + Math.sin(state.gameTime * mo.speed + (mo.phase || 0)) * mo.rangeX;
        const my = mo.startY + Math.sin(state.gameTime * mo.speed + (mo.phase || 0)) * mo.rangeY;
        
        const shadowPoly: { x: number; y: number }[] = [];
        if (dx >= 0) {
          shadowPoly.push({ x: mx, y: my });
          shadowPoly.push({ x: mx + mo.w, y: my });
          shadowPoly.push({ x: mx + mo.w, y: my + mo.h });
          shadowPoly.push({ x: mx + mo.w + (Y_max - (my + mo.h)) * dx / dy, y: Y_max });
          shadowPoly.push({ x: mx + (Y_max - my) * dx / dy, y: Y_max });
        } else {
          shadowPoly.push({ x: mx + mo.w, y: my });
          shadowPoly.push({ x: mx, y: my });
          shadowPoly.push({ x: mx, y: my + mo.h });
          shadowPoly.push({ x: mx + (Y_max - (my + mo.h)) * dx / dy, y: Y_max });
          shadowPoly.push({ x: mx + mo.w + (Y_max - my) * dx / dy, y: Y_max });
        }
        shadows.push(shadowPoly);
      } else if (mo.type === 'spinning_bar') {
        // Calculate rotated corners
        const cx = mo.startX;
        const cy = mo.startY;
        const w2 = mo.w / 2;
        const h2 = mo.h / 2;
        const angle = (mo.angle || 0) + state.gameTime * (mo.rotationSpeed || 0);
        
        // 4 corners of unrotated bar around center
        const localCorners = [
          { x: -w2, y: -h2 },
          { x: w2, y: -h2 },
          { x: w2, y: h2 },
          { x: -w2, y: h2 }
        ];

        // Rotate corners
        const rotCorners = localCorners.map(c => {
          const rx = cx + c.x * Math.cos(angle) - c.y * Math.sin(angle);
          const ry = cy + c.x * Math.sin(angle) + c.y * Math.cos(angle);
          return { x: rx, y: ry };
        });

        // For a spinning bar, a robust way to cast shadow is:
        // Project all 4 rotated vertices to Y_max, and make shadows for each edge.
        // We can just add the individual edge shadows.
        for (let i = 0; i < 4; i++) {
          const v1 = rotCorners[i];
          const v2 = rotCorners[(i + 1) % 4];
          
          const p1 = { x: v1.x + (Y_max - v1.y) * dx / dy, y: Y_max };
          const p2 = { x: v2.x + (Y_max - v2.y) * dx / dy, y: Y_max };
          
          shadows.push([v1, v2, p2, p1]);
        }
      }
    });

    return shadows;
  };

  // Update Game Logic
  const updateGame = () => {
    const state = stateRef.current;
    state.gameTime += 1;

    // Decrement spawn protection timer
    if (state.protectionTimer > 0) {
      state.protectionTimer--;
    }

    // Decay screen flash
    if (state.screenFlash > 0) {
      state.screenFlash = Math.max(0, state.screenFlash - 0.02);
    }

    // 1. TIME OF DAY & SUN MOVEMENT (June Solstice Effect)
    const globalProgress = (typeof solsticeProgressRef.current === 'number' ? solsticeProgressRef.current : 0);
    
    // Sun arc: Starts low (morning), rises to zenith (noon), then slightly descends (evening)
    // Angle range: 0.35 (Dawn) → 1.5 (Zenith) → 1.2 (Late Afternoon)
    const sunArc = 0.35 + globalProgress * 1.15;
    state.sunAngle = sunArc;
    
    // Update audio intensity based on Solstice
    audio.setMusicIntensity(globalProgress);
    
    // Report progress to parent (for HUD indicator) - SLOWER progression
    if (onSolsticeProgressUpdateRef.current) {
      // Use both time AND position for progression, but much slower
      const timeFactor = Math.min(1, state.gameTime / 6000); // ~100 seconds to full progression
      const positionFactor = Math.min(1, state.px / (state.level.width * 1.5)); // Slower position tracking
      const localProgress = (timeFactor * 0.6 + positionFactor * 0.4); // Weight time more heavily
      const combinedProgress = Math.max(globalProgress, Math.min(0.98, (state.level.id - 1) * 0.2 + localProgress * 0.15));
      onSolsticeProgressUpdateRef.current(Math.min(1, combinedProgress));
    }

    // Dramatic Noon Event Trigger
    if (globalProgress >= 0.45 && globalProgress <= 0.65 && !state.noonEventTriggered) {
      state.noonEventTriggered = true;
      state.screenFlash = 1.0;
      state.loreOverlayText = "ZENITH REACHED: The Sun blazes at its absolute peak. Shadows shrink to a razor's edge.";
      state.loreTimer = 300;
      setShowLore(state.loreOverlayText);
    }

    // ABILITY SCALING based on Solstice progress
    let dashSpeed = 11.5;
    let teleportRange = 220;
    if (globalProgress < 0.35) {
      dashSpeed = 14.0; // Morning: Strong abilities, long range
      teleportRange = 320;
    } else if (globalProgress <= 0.75) {
      dashSpeed = 9.0; // Noon: Weaker abilities, short range
      teleportRange = 170;
    } else {
      dashSpeed = 12.0; // Evening: Abilities recovering
      teleportRange = 250;
    }

    // 2. MOVEMENT INPUTS
    const moveLeft = state.keys.a || state.keys.ArrowLeft;
    const moveRight = state.keys.d || state.keys.ArrowRight;
    const jumpPressed = state.keys.w || state.keys.Space;
    const dashPressed = state.keys.Shift;
    const teleportPressed = state.keys.e;
    const jumpJustPressed = jumpPressed && !state.jumpHeldLast;

    if (jumpJustPressed) {
      state.jumpBufferTimer = 9; // ~150ms at 60 FPS
    } else if (state.jumpBufferTimer > 0) {
      state.jumpBufferTimer--;
    }

    if (state.isGrounded) {
      state.coyoteTimer = 9; // ~150ms grace after leaving a ledge
    } else if (state.coyoteTimer > 0) {
      state.coyoteTimer--;
    }

    // TELEPORTATION ANIMATION (Dissolving into shadow fragments)
    if (state.teleportActive) {
      state.teleportTimer--;
      state.vx = 0;
      state.vy = 0;
      
      // Move fragments toward target
      if (state.teleportTarget) {
        state.teleportFragments.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
        });
        
        if (state.teleportTimer <= 0) {
          state.px = state.teleportTarget.x;
          state.py = state.teleportTarget.y;
          state.teleportActive = false;
          
          // Spawn reassembly particles
          for (let i = 0; i < 25; i++) {
            state.particles.push({
              x: state.px + state.pw / 2,
              y: state.py + state.ph / 2,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              size: 2 + Math.random() * 6,
              alpha: 0.9,
              color: '#701a75',
              life: 0,
              maxLife: 25 + Math.random() * 20
            });
          }
        }
      }
      // Skip normal physics while teleporting
    } else {
      // 3. DASH ABILITY
      if (state.dashCooldown > 0) state.dashCooldown--;
      
      if (dashPressed && state.dashCooldown === 0 && state.shadowEnergy >= 30 && !state.dashActive) {
        state.dashActive = true;
        state.dashTimer = 12; // 12 frames of dash
        state.dashCooldown = 35; // ~0.6s cooldown
        state.shadowEnergy = Math.max(0, state.shadowEnergy - 30);
        
        // Determine dash direction
        let dx = 0;
        if (moveLeft) dx = -1;
        if (moveRight) dx = 1;
        if (dx === 0) dx = state.facingDir; // Dash in direction we are facing
        
        state.dashDir = { x: dx, y: 0 };
        state.vy = 0; // Cancel vertical velocity
        
        audio.playDash();
        
        // Emit dramatic dash burst particles with distortion wave
        for (let i = 0; i < 35; i++) {
          const angle = (Math.random() - 0.5) * Math.PI * 0.8;
          const speed = 4 + Math.random() * 10;
          state.particles.push({
            x: state.px + state.pw / 2,
            y: state.py + state.ph / 2,
            vx: Math.cos(angle) * speed * dx + (Math.random() - 0.5) * 3,
            vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 3,
            size: 4 + Math.random() * 8,
            alpha: 1.0,
            color: i % 3 === 0 ? '#7c3aed' : '#3b0764',
            life: 0,
            maxLife: 25 + Math.random() * 20
          });
        }
        
        // Add distortion wave effect
        for (let i = 0; i < 8; i++) {
          state.particles.push({
            x: state.px + state.pw / 2 + dx * (20 + i * 8),
            y: state.py + state.ph / 2 + (Math.random() - 0.5) * 40,
            vx: dx * 6,
            vy: 0,
            size: 15 + Math.random() * 10,
            alpha: 0.4,
            color: '#a855f7',
            life: 0,
            maxLife: 12
          });
        }
      }

      if (state.dashActive) {
        state.vx = state.dashDir.x * dashSpeed;
        state.vy = 0; // Freeze gravity
        state.dashTimer--;
        
        // Spawn dense shadow trail particles
        for (let j = 0; j < 3; j++) {
          state.particles.push({
            x: state.px + Math.random() * state.pw,
            y: state.py + Math.random() * state.ph,
            vx: -state.dashDir.x * (1 + Math.random() * 3),
            vy: (Math.random() - 0.5) * 3,
            size: 4 + Math.random() * 5,
            alpha: 0.8,
            color: '#4c1d95',
            life: 0,
            maxLife: 25
          });
        }

        if (state.dashTimer <= 0) {
          state.dashActive = false;
          state.vx *= 0.5; // Decelerate slightly after dash
        }
      } else {
        // Normal Horizontal Physics
        let targetVx = 0;
        if (moveLeft) {
          targetVx = -4.2;
          state.facingDir = -1;
        }
        if (moveRight) {
          targetVx = 4.2;
          state.facingDir = 1;
        }

        // Apply acceleration / friction
        if (targetVx !== 0) {
          state.vx += (targetVx - state.vx) * 0.18;
        } else {
          state.vx *= 0.82; // Friction
        }
      }

      // 4. TELEPORTATION TO SHADOW NODES
      let bestNode: ShadowNode | null = null;
      let minDist = teleportRange;
      
      state.shadowNodes.forEach(node => {
        if (!node.active) return;
        const dx = node.x - (state.px + state.pw / 2);
        const dy = node.y - (state.py + state.ph / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
          minDist = dist;
          bestNode = node;
        }
      });

      state.selectedNode = bestNode;

      if (teleportPressed && state.selectedNode && state.shadowEnergy >= 15 && !state.teleportActive) {
        const targetNode = state.selectedNode as ShadowNode;
        state.shadowEnergy = Math.max(0, state.shadowEnergy - 15);
        
        state.teleportActive = true;
        state.teleportTimer = 18;
        state.teleportTarget = { x: targetNode.x - state.pw / 2, y: targetNode.y - state.ph / 2 };
        state.teleportFragments = [];

        // Spawn dramatic dissolve fragments
        for (let i = 0; i < 35; i++) {
          const fx = state.px + Math.random() * state.pw;
          const fy = state.py + Math.random() * state.ph;
          const dx = (targetNode.x - fx) / 18;
          const dy = (targetNode.y - fy) / 18;
          state.teleportFragments.push({
            x: fx,
            y: fy,
            vx: dx + (Math.random() - 0.5) * 3,
            vy: dy + (Math.random() - 0.5) * 3,
            size: 4 + Math.random() * 8,
            color: i % 4 === 0 ? '#7c3aed' : (i % 3 === 0 ? '#1e1b4b' : '#a855f7')
          });
        }
        
        // Add teleport initiation burst
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 6;
          state.particles.push({
            x: state.px + state.pw / 2,
            y: state.py + state.ph / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 5,
            alpha: 0.8,
            color: '#c084fc',
            life: 0,
            maxLife: 18 + Math.random() * 12
          });
        }

        audio.playTeleport();
        state.keys.e = false;
      }

      // 5. VERTICAL PHYSICS & GRAVITY
      if (!state.isGrounded && !state.dashActive) {
        state.vy += 0.38; // Gravity
        if (state.vy > 10) state.vy = 10; // Terminal velocity
      }

      // Variable jump height: releasing jump early cuts upward velocity.
      if (!jumpPressed && state.jumpCutAvailable && state.vy < -2.5) {
        state.vy *= 0.55;
        state.jumpCutAvailable = false;
      }

      // Wall slide detection
      let isWallSliding = false;
      let wallDir = 0;
      
      if (!state.isGrounded && !state.dashActive) {
        const checkDist = 2;
        const leftWallBox = { x: state.px - checkDist, y: state.py + 4, w: checkDist, h: state.ph - 8 };
        const rightWallBox = { x: state.px + state.pw, y: state.py + 4, w: checkDist, h: state.ph - 8 };
        
        let hitLeft = false;
        let hitRight = false;
        
        state.platforms.forEach(p => {
          if (p.w === 0 || p.h === 0) return;
          if (checkAABB(leftWallBox, p)) hitLeft = true;
          if (checkAABB(rightWallBox, p)) hitRight = true;
        });

        if (hitLeft && (moveLeft || state.keys.a)) {
          isWallSliding = true;
          wallDir = -1;
        } else if (hitRight && (moveRight || state.keys.d)) {
          isWallSliding = true;
          wallDir = 1;
        }
        
        if (isWallSliding && state.vy > 1.2) {
          state.vy = 1.2;
          if (Math.random() > 0.5) {
            state.particles.push({
              x: wallDir === -1 ? state.px : state.px + state.pw,
              y: state.py + Math.random() * state.ph,
              vx: -wallDir * (0.5 + Math.random()),
              vy: -0.5,
              size: 2 + Math.random() * 3,
              alpha: 0.6,
              color: '#311042',
              life: 0,
              maxLife: 15
            });
          }
        }
      }

      // JUMPING & WALL JUMPING WITH ANTICIPATION (Squash and Stretch)
      if (state.landingTimer > 0) state.landingTimer--;

      if (state.jumpAnticipationTimer > 0) {
        state.jumpAnticipationTimer--;
        if (state.jumpAnticipationTimer === 0 && state.jumpPending) {
          state.jumpPending = false;
          if (state.jumpPendingWallDir === 0) {
            state.vy = -9.2;
            state.isGrounded = false;
            state.coyoteTimer = 0;
            state.jumpCutAvailable = true;
            audio.playJump();
            for (let i = 0; i < 10; i++) {
              state.particles.push({
                x: state.px + state.pw / 2,
                y: state.py + state.ph,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 2,
                size: 3 + Math.random() * 5,
                alpha: 0.7,
                color: '#1e1b4b',
                life: 0,
                maxLife: 22
              });
            }
          } else {
            state.vy = -8.2;
            state.vx = -state.jumpPendingWallDir * 5.2;
            state.jumpCutAvailable = true;
            audio.playJump();
            for (let i = 0; i < 10; i++) {
              state.particles.push({
                x: state.jumpPendingWallDir === -1 ? state.px : state.px + state.pw,
                y: state.py + state.ph / 2,
                vx: -state.jumpPendingWallDir * (2 + Math.random() * 5),
                vy: (Math.random() - 0.5) * 5,
                size: 3 + Math.random() * 5,
                alpha: 0.8,
                color: '#2e1065',
                life: 0,
                maxLife: 22
              });
            }
          }
        }
      } else if (state.jumpBufferTimer > 0 && !state.dashActive) {
        if (state.isGrounded || state.coyoteTimer > 0) {
          state.jumpAnticipationTimer = 4; // 4 frames of pre-jump squash
          state.jumpPending = true;
          state.jumpPendingWallDir = 0;
          state.jumpBufferTimer = 0;
        } else if (isWallSliding) {
          state.jumpAnticipationTimer = 4;
          state.jumpPending = true;
          state.jumpPendingWallDir = wallDir;
          state.jumpBufferTimer = 0;
        }
      }

      // 6. COLLISION RESOLUTION (PLATFORMS & PUSHABLE BLOCKS)
      state.pushableBlocks.forEach((b: PushableBlock) => {
        b.vy += 0.38; // Block gravity
        if (b.vy > 10) b.vy = 10;
        
        b.y += b.vy;
        state.platforms.forEach((p: Platform) => {
          if (p.w === 0 || p.h === 0) return;
          if (checkAABB(b, p)) {
            if (b.vy > 0) {
              b.y = p.y - b.h;
              b.vy = 0;
            } else if (b.vy < 0) {
              b.y = p.y + p.h;
              b.vy = 0;
            }
          }
        });

        b.x += b.vx;
        b.vx *= 0.8; // High friction on ground
        state.platforms.forEach((p: Platform) => {
          if (p.w === 0 || p.h === 0) return;
          if (checkAABB(b, p)) {
            if (b.vx > 0) {
              b.x = p.x - b.w;
              b.vx = 0;
            } else if (b.vx < 0) {
              b.x = p.x + p.w;
              b.vx = 0;
            }
          }
        });
      });

      // Move Player X and check collisions
      state.px += state.vx;
      state.platforms.forEach((p: Platform) => {
        if (p.w === 0 || p.h === 0) return;
        if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, p)) {
          if (state.vx > 0) {
            state.px = p.x - state.pw;
            state.vx = 0;
          } else if (state.vx < 0) {
            state.px = p.x + p.w;
            state.vx = 0;
          }
        }
      });

      state.pushableBlocks.forEach((b: PushableBlock) => {
        if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, b)) {
          if (state.vx > 0) {
            b.vx = 2.0;
            state.px = b.x - state.pw;
          } else if (state.vx < 0) {
            b.vx = -2.0;
            state.px = b.x + b.w;
          }
        }
      });

      // Track previous grounded state for landing squash
      state.lastIsGrounded = state.isGrounded;
      state.lastVy = state.vy;

      // Move Player Y and check collisions
      state.py += state.vy;
      state.isGrounded = false;
      
      state.platforms.forEach((p: Platform) => {
        if (p.w === 0 || p.h === 0) return;
        if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, p)) {
          if (state.vy > 0) {
            state.py = p.y - state.ph;
            state.vy = 0;
            state.isGrounded = true;
          } else if (state.vy < 0) {
            state.py = p.y + p.h;
            state.vy = 0;
          }
        }
      });

      state.pushableBlocks.forEach((b: PushableBlock) => {
        if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, b)) {
          if (state.vy > 0) {
            state.py = b.y - state.ph;
            state.vy = 0;
            state.isGrounded = true;
          } else if (state.vy < 0) {
            state.py = b.y + b.h;
            state.vy = 0;
          }
        }
      });

      // Check landing impact trigger
      if (state.isGrounded && !state.lastIsGrounded && state.lastVy > 2) {
        state.landingTimer = 6; // 6 frames of landing squash
        state.screenShake = Math.max(state.screenShake, 1.2);
        // Play layered landing SFX (throttled to avoid spam)
        if (state.gameTime - state.lastLandSoundFrame > 12) {
          audio.playLand();
          state.lastLandSoundFrame = state.gameTime;
        }
        for (let i = 0; i < 12; i++) {
          state.particles.push({
            x: state.px + state.pw / 2,
            y: state.py + state.ph,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 2,
            size: 2 + Math.random() * 4,
            alpha: 0.65,
            color: '#4c1d95',
            life: 0,
            maxLife: 18 + Math.random() * 12
          });
        }
      }
    }

    // Boundaries of the level
    if (state.px < 0) state.px = 0;
    if (state.px > state.level.width - state.pw) state.px = state.level.width - state.pw;
    
    // Falling off-screen is a death
    if (state.py > state.level.height + 50) {
      dieAndRespawn(state);
    }

    // 7. BLOCK DYNAMIC LIGHT BEAMS
    // If a pushable block is pushed under a light beam, the light beam is blocked!
    state.lightBeams.forEach((beam: LightBeam) => {
      if (beam.blockerId) {
        const blocker = state.pushableBlocks.find(b => b.id === beam.blockerId);
        if (blocker) {
          // Check if blocker intersects the beam horizontally
          const blockerLeft = blocker.x;
          const blockerRight = blocker.x + blocker.w;
          const beamLeft = beam.x;
          const beamRight = beam.x + beam.w;
          
          const intersectsHorizontally = blockerLeft < beamRight && blockerRight > beamLeft;
          // Also blocker must be above the hazard zone (or blocking it)
          if (intersectsHorizontally && blocker.y > 0) {
            beam.active = false; // Deactivate this deadly beam!
          } else {
            beam.active = true;
          }
        }
      }
    });

    // 8. SHADOW & SUNLIGHT DETECTION
    // Generate all shadow polygons for this frame
    const shadowPolys = getShadowPolygons(state);

    // Check if player's critical points are inside ANY shadow polygon
    const pCenter = { x: state.px + state.pw / 2, y: state.py + state.ph / 2 };
    const pFeet = { x: state.px + state.pw / 2, y: state.py + state.ph - 2 };
    
    let centerInShadow = false;
    let feetInShadow = false;

    // Check static and dynamic shadows
    for (let i = 0; i < shadowPolys.length; i++) {
      const poly = shadowPolys[i];
      if (!centerInShadow && isPointInPolygon(pCenter, poly)) centerInShadow = true;
      if (!feetInShadow && isPointInPolygon(pFeet, poly)) feetInShadow = true;
      if (centerInShadow && feetInShadow) break;
    }

    // 9. CHECK MOVING CLOUDS SHADOWS (For Level 4)
    // Clouds are in the sky, they project a broad shadow onto the ground.
    // Cloud casts shadow from cx + (Y - cy)*dx/dy to cx + cw + (Y - cy)*dx/dy
    if (state.level.id === 4) {
      const dx = Math.cos(state.sunAngle);
      const dy = Math.sin(state.sunAngle);
      
      state.movingObjects.forEach((mo: MovingObject) => {
        if (mo.type === 'cloud') {
          // Calculate active position of cloud
          const cx = mo.startX + (state.gameTime * mo.speed) % mo.rangeX;
          const cy = mo.startY;
          
          // Shadow projection boundaries at the player's vertical height
          const projOffset = (pCenter.y - cy) * dx / dy;
          const shadowLeft = cx + projOffset;
          const shadowRight = cx + mo.w + projOffset;
          
          if (pCenter.x >= shadowLeft && pCenter.x <= shadowRight) {
            centerInShadow = true;
          }
          if (pFeet.x >= shadowLeft && pFeet.x <= shadowRight) {
            feetInShadow = true;
          }
        }
      });
    }

    // Determine overall safety
    // To make it fun and responsive, the player is safe if their center OR feet are in shadow
    state.inShadow = centerInShadow || feetInShadow;

    // A standing player is safe in a natural starting zone or near portals
    if (state.px < 180 || Math.abs(state.px - state.level.goalX) < 100) {
      state.inShadow = true;
    }

    // FIX: When the player is grounded on any non-danger platform, they are in shadow
    // (the platform itself blocks the sun from reaching them)
    if (state.isGrounded) {
      const playerBottom = { x: state.px + 4, y: state.py + state.ph + 2, w: state.pw - 8, h: 4 };
      let onSafePlatform = false;
      let onDangerPlatform = false;
      state.platforms.forEach(p => {
        if (p.w === 0 || p.h === 0) return;
        if (checkAABB(playerBottom, p)) {
          if (p.type === 'danger') onDangerPlatform = true;
          else onSafePlatform = true;
        }
      });
      if (onSafePlatform && !onDangerPlatform) state.inShadow = true;
    }

    // In endless mode, always provide a generous safe zone around the player
    // since shadow generation can be sparse
    if (isEndlessRef.current && state.isGrounded) {
      const playerBottom = { x: state.px + 4, y: state.py + state.ph + 2, w: state.pw - 8, h: 4 };
      let onAnyPlatform = false;
      state.platforms.forEach(p => {
        if (p.w === 0 || p.h === 0) return;
        if (checkAABB(playerBottom, p)) onAnyPlatform = true;
      });
      if (onAnyPlatform) state.inShadow = true;
    }

    // Check if player is standing on deadly spike platforms (Crystal Cliffs / Desert / Summit)
    let standingOnSpikes = false;
    state.platforms.forEach(p => {
      if (p.type === 'danger' && checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, p)) {
        standingOnSpikes = true;
      }
    });

    // Check if player is touching any active Light Beam
    let hitLightBeam = false;
    state.lightBeams.forEach(beam => {
      if (beam.active) {
        const beamBox = { x: beam.x, y: beam.y, w: beam.w, h: beam.h };
        if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, beamBox)) {
          hitLightBeam = true;
        }
      }
    });

    // 10. SHADOW ENERGY DRAIN / REGEN
    if (state.protectionTimer > 0) {
      // Spawn protection active: immune to drain!
      audio.playBurn(false);
    } else if (state.dashActive) {
      // Dashing players are immune to light drain
      audio.playBurn(false);
    } else if (!state.inShadow || standingOnSpikes || hitLightBeam) {
      // SUNLIGHT DANGER!
      // Dynamically calculate drain rate based on Solstice progress (adjusted to be much fairer)
      let drainRate = 0.45;
      const progress = (typeof solsticeProgressRef.current === 'number' ? solsticeProgressRef.current : 0);
      if (progress < 0.35) {
        drainRate = 0.15; // Morning: Very gentle drain
      } else if (progress <= 0.75) {
        drainRate = 0.45; // Noon: Manageable dangerous drain
      } else {
        drainRate = 0.25; // Evening: Reduced drain
      }
      
      state.shadowEnergy = Math.max(0, state.shadowEnergy - drainRate);
      state.screenShake = Math.max(state.screenShake, 1.5);
      audio.playBurn(true);

      // Emit orange sizzling/burning sparks
      if (Math.random() > 0.3) {
        state.particles.push({
          x: state.px + Math.random() * state.pw,
          y: state.py + Math.random() * state.ph,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3 - 1,
          size: 2 + Math.random() * 3,
          alpha: 0.9,
          color: '#f97316', // Orange
          life: 0,
          maxLife: 20 + Math.random() * 15
        });
      }
      
      if (state.shadowEnergy <= 0) {
        dieAndRespawn(state);
      }
    } else {
      // SAFE IN SHADOWS - Much faster regeneration
      state.shadowEnergy = Math.min(state.maxShadowEnergy, state.shadowEnergy + 1.8);
      audio.playBurn(false);
      
      // Stand-in shadow glow particles (cool purple/blue)
      if (state.shadowEnergy < state.maxShadowEnergy && Math.random() > 0.7) {
        state.particles.push({
          x: state.px + Math.random() * state.pw,
          y: state.py + state.ph,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 1.5,
          size: 2 + Math.random() * 2,
          alpha: 0.5,
          color: '#818cf8', // Indigo
          life: 0,
          maxLife: 25
        });
      }
    }

    // 11. CHECKPOINTS
    state.checkpoints.forEach((cp: Checkpoint) => {
      const cpBox = { x: cp.x - 20, y: cp.y - 40, w: 40, h: 60 };
      if (!cp.activated && checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, cpBox)) {
        cp.activated = true;
        state.checkpointX = cp.x;
        state.checkpointY = cp.y;
        state.activeCheckpointId = cp.id;
        state.screenFlash = 1.0; // Satisfying light pulse on checkpoint!
        audio.playCheckpoint();
        
        // Spawn checkpoint flare
        for (let i = 0; i < 25; i++) {
          state.particles.push({
            x: cp.x,
            y: cp.y - 15,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: 3 + Math.random() * 5,
            alpha: 0.9,
            color: '#d946ef',
            life: 0,
            maxLife: 35
          });
        }
      }
    });

    // 12. COLLECT ORBS
    state.orbs.forEach((orb: CollectibleOrb) => {
      if (!orb.collected) {
        const orbBox = { x: orb.x - 15, y: orb.y - 15, w: 30, h: 30 };
        if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, orbBox)) {
          orb.collected = true;
          audio.playCollect();
          
          if (orb.type === 'lore' && orb.loreText) {
            state.loreOverlayText = orb.loreText;
            state.loreTimer = 350; // Show for ~6 seconds
            setShowLore(orb.loreText);
          } else {
            // Restore energy
            state.shadowEnergy = Math.min(state.maxShadowEnergy, state.shadowEnergy + 40);
          }

          // Orb pop particles
          for (let i = 0; i < 12; i++) {
            state.particles.push({
              x: orb.x,
              y: orb.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              size: 2 + Math.random() * 4,
              alpha: 0.8,
              color: orb.type === 'lore' ? '#e0f2fe' : '#c084fc',
              life: 0,
              maxLife: 25
            });
          }
        }
      }
    });

    // Dismiss lore text slowly
    if (state.loreTimer > 0) {
      state.loreTimer--;
      if (state.loreTimer === 0) {
        state.loreOverlayText = null;
        setShowLore(null);
      }
    }

    // 13. CLOUD POSITIONS & MOVEMENT (Decorative & Level 4 / Endless)
    state.clouds.forEach(c => {
      c.cx += c.speed;
      // Wrap around if it goes off level
      if (c.cx > state.level.width + 150) {
        c.cx = -c.cw - 50;
      }
    });

    // Endless mode dynamic difficulty and infinite world generation
    if (isEndlessRef.current) {
      state.endlessDistance += Math.abs(state.vx) * 0.1;
      const dist = state.endlessDistance;
      // SLOW DOWN: Increase threshold so intensity stays at each level longer
      if (dist > 500 * state.endlessDifficulty) {
        state.endlessDifficulty += 0.3;
        state.loreOverlayText = `Solstice Intensity: ${Math.round(state.endlessDifficulty * 10)}%`;
        state.loreTimer = 200;
        setShowLore(state.loreOverlayText);
        audio.setMusicIntensity(Math.min(1, state.endlessDifficulty * 0.08));
      }
      
      // Generate endless platforms, ruins, cloud shadows, and nodes on the fly
      // IMPORTANT: Generate frequently enough to always have land ahead
      state.endlessCloudSpawnCounter++;
      if (state.endlessCloudSpawnCounter > 40) { // Much faster generation (was 90)
        state.endlessCloudSpawnCounter = 0;
        // Find the rightmost existing platform to chain from
        let rightmostX = 0;
        state.platforms.forEach(p => {
          const endX = p.x + p.w;
          if (endX > rightmostX) rightmostX = endX;
        });
        
        const nextX = Math.max(state.px + 1800, rightmostX + 50 + Math.random() * 200);
        const platformWidth = 300 + Math.random() * 500; // Long continuous platforms
        
        state.platforms.push(
          { x: nextX, y: 520, w: platformWidth, h: 90, type: 'sand' },
          { x: nextX + 40, y: 380 + Math.random() * 40, w: 80 + Math.random() * 120, h: 35, type: 'ruins' },
          // Additional mid-height platforms for variety
          { x: nextX + platformWidth * 0.4, y: 420 + Math.random() * 30, w: 60 + Math.random() * 80, h: 35, type: 'ruins' }
        );
        
        state.clouds.push({
          cx: nextX - 100, cy: 45 + Math.random() * 30,
          cw: 200 + Math.random() * 160, ch: 25 + Math.random() * 10,
          speed: 0.8 + Math.random() * 0.8,
        });
        
        // More frequent teleport nodes for safety
        if (state.shadowNodes.length < 50) {
          state.shadowNodes.push(
            { id: `endlessNode${state.shadowNodes.length}`, x: nextX + 60, y: 320, active: true }
          );
        }
        
        // Prune far-behind objects to keep memory bounded
        state.platforms = state.platforms.filter(p => p.x > state.px - 2000);
        state.clouds = state.clouds.filter(c => c.cx > state.px - 1500);
        state.shadowNodes = state.shadowNodes.filter(n => n.x > state.px - 1800);
        state.orbs = state.orbs.filter(o => o.collected || o.x > state.px - 1800);
        // MORE FREQUENT energy orbs to keep player alive
        if (state.orbs.length < 6 && Math.random() > 0.4) {
          state.orbs.push({ id: `endlessO${state.orbs.length}`, x: nextX + platformWidth * 0.5, y: 320, collected: false, type: 'energy' });
        }
      }
    }

    // 14. PARTICLES SYSTEM
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - (p.life / p.maxLife);
      return p.life < p.maxLife;
    });

    // Add ambient wind/dust particles
    if (Math.random() > 0.75) {
      // Only spawn near camera to save resources
      const spawnX = state.camX + Math.random() * 900;
      state.particles.push({
        x: spawnX,
        y: Math.random() * state.level.height,
        vx: -0.5 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 2,
        alpha: 0.3,
        color: '#fef08a', // Pale gold
        life: 0,
        maxLife: 100 + Math.random() * 100
      });
    }

    // 15. CAMERA SMOOTHING
    const targetCamX = state.px - 400; // Center player
    const targetCamY = state.py - 300;
    
    state.camX += (targetCamX - state.camX) * 0.08;
    state.camY += (targetCamY - state.camY) * 0.08;

    // Lock camera to level boundaries
    if (state.camX < 0) state.camX = 0;
    if (state.camX > state.level.width - 800) state.camX = state.level.width - 800;
    if (state.camY < 0) state.camY = 0;
    if (state.camY > state.level.height - 600) state.camY = state.level.height - 600;

    // Decay screen shake
    if (state.screenShake > 0) state.screenShake *= 0.9;

    // 16. GOAL PORTAL REACHED
    const goalBox = { x: state.level.goalX - 30, y: state.level.goalY - 60, w: 60, h: 80 };
    if (checkAABB({ x: state.px, y: state.py, w: state.pw, h: state.ph }, goalBox)) {
      audio.playBurn(false);
      
      if (state.level.id === 5) {
        // Trigger the beautiful celestial Eclipse Ending!
        state.levelCompleted = true;
        audio.playVictory();
        onEndingTriggerRef.current();
      } else if (isEndlessRef.current) {
        // Endless mode: celebration and keep going
        state.loreOverlayText = `You have traveled ${Math.round(state.endlessDistance)} meters through the Solstice fire. The journey continues...`;
        state.loreTimer = 300;
        setShowLore(state.loreOverlayText);
        // Move the goal forward so the player can keep running
        state.level.goalX += 2400;
      } else {
        // Normal level completion - start the visual transition
        state.levelCompleted = true;
        state.transitionTimer = 0.01; // Start from near-zero so it fades in
        audio.playCheckpoint();
      }
    }
    state.jumpHeldLast = jumpPressed;
  };

  // Player death sequence
  const dieAndRespawn = (state: any) => {
    state.deaths++;
    audio.playBurn(false);
    
    // Spawn massive death explosion of shadow particles
    for (let i = 0; i < 40; i++) {
      state.particles.push({
        x: state.px + state.pw / 2,
        y: state.py + state.ph / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        size: 3 + Math.random() * 8,
        alpha: 1.0,
        color: i % 2 === 0 ? '#1e1b4b' : '#ea580c', // Blend dark blue and fiery orange
        life: 0,
        maxLife: 35 + Math.random() * 25
      });
    }

    // Set screen shake
    state.screenShake = 12.0;

    // Reposition player at last checkpoint
    state.px = state.checkpointX;
    state.py = state.checkpointY;
    state.vx = 0;
    state.vy = 0;
    state.shadowEnergy = 100;
    state.inShadow = true;
    state.protectionTimer = 180;
    state.teleportActive = false;
    state.teleportTimer = 0;
    state.jumpAnticipationTimer = 0;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    state.jumpHeldLast = false;
    state.jumpCutAvailable = false;
    state.landingTimer = 0;
  };

  // Axis-Aligned Bounding Box Collision
  const checkAABB = (r1: { x: number; y: number; w: number; h: number }, r2: { x: number; y: number; w: number; h: number }) => {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  };

  // =========================================================================
  // CANVAS RENDERING
  // =========================================================================
  const renderGame = (ctx: CanvasRenderingContext2D, screenW: number, screenH: number) => {
    const state = stateRef.current;
    
    // Clear screen
    ctx.clearRect(0, 0, screenW, screenH);

    // Apply screen shake and camera transform
    ctx.save();
    if (state.screenShake > 0.1) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
    }
    
    const cx = Math.round(state.camX);
    const cy = Math.round(state.camY);

    // 1. DRAW SKY GRADIENT
    const progress = (typeof solsticeProgressRef.current === 'number' ? solsticeProgressRef.current : 0);
    let cTop = state.level.skyColors[0];
    let cMid = state.level.skyColors[1];
    let cBot = state.level.skyColors[2];
    
    if (progress < 0.35) {
      // Morning: Warm oranges, soft pinks
      cTop = '#2b1055'; cMid = '#e05263'; cBot = '#ffd166';
    } else if (progress <= 0.70) {
      // Noon: Bright blue, intense sunlight
      cTop = '#0077b6'; cMid = '#00b4d8'; cBot = '#90e0ef';
    } else if (progress <= 0.85) {
      // Afternoon: Golden tones
      cTop = '#d4a373'; cMid = '#faedcd'; cBot = '#e9c46a';
    } else {
      // Evening: Purple, deep orange, red gradients
      cTop = '#3c096c'; cMid = '#7b2cbf'; cBot = '#ff99c8';
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, screenH);
    skyGrad.addColorStop(0, cTop);
    skyGrad.addColorStop(0.5, cMid);
    skyGrad.addColorStop(1, cBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, screenW, screenH);

    // 2. MULTI-LAYER PARALLAX ENVIRONMENT SYSTEM
    // Layer 1: Distant mountains (slowest)
    ctx.save();
    ctx.translate(-cx * 0.15, -cy * 0.08);
    drawParallaxLayer(ctx, state.level.id, state.level.width, 'far');
    ctx.restore();
    
    // Layer 2: Mid-distance forest/hills
    ctx.save();
    ctx.translate(-cx * 0.35, -cy * 0.18);
    drawParallaxLayer(ctx, state.level.id, state.level.width, 'mid');
    ctx.restore();
    
    // Layer 3: Near vegetation/rocks
    ctx.save();
    ctx.translate(-cx * 0.55, -cy * 0.28);
    drawParallaxLayer(ctx, state.level.id, state.level.width, 'near');
    ctx.restore();

    // 3. DRAW VOLUMETRIC LIGHT & THE SOLSTICE SUN
    drawSunAndLightRays(ctx, state, screenW);

    // Begin drawing world-space coordinates
    ctx.save();
    ctx.translate(-cx, -cy);

    // 4. DRAW DECORATIVE CLOUDS (High in sky)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    state.clouds.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.cx, c.cy, c.cw, c.ch, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. DRAW SHADOW POLYGONS (THE SAFE PATHS)
    // We fill all projected shadows in a semi-transparent rich midnight indigo
    ctx.fillStyle = 'rgba(10, 14, 30, 0.78)';
    const shadowPolys = getShadowPolygons(state);
    shadowPolys.forEach(poly => {
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.fill();
    });

    // 6. DRAW CHECKPOINTS
    state.checkpoints.forEach((cp: Checkpoint) => {
      // Draw checkpoint pedestal
      ctx.fillStyle = cp.activated ? '#6b21a8' : '#374151';
      ctx.fillRect(cp.x - 10, cp.y - 15, 20, 15);
      
      // Floating glowing orb on top
      ctx.beginPath();
      ctx.arc(cp.x, cp.y - 25, 6, 0, Math.PI * 2);
      
      if (cp.activated) {
        // Pulsing active checkpoint
        const glow = 5 + Math.sin(state.gameTime * 0.1) * 3;
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = glow;
        ctx.fillStyle = '#f0abfc';
        ctx.fill();
        
        // Draw spinning aura rings
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y - 25, 10 + Math.sin(state.gameTime * 0.05) * 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#9ca3af';
        ctx.fill();
      }
    });

    // 7. DRAW COLLECTIBLE ORBS
    state.orbs.forEach((orb: CollectibleOrb) => {
      if (!orb.collected) {
        const bounce = Math.sin(state.gameTime * 0.08 + parseFloat(orb.id.replace(/\D/g, ''))) * 4;
        const oy = orb.y + bounce;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(orb.x, oy, 8, 0, Math.PI * 2);
        
        if (orb.type === 'lore') {
          ctx.shadowColor = '#e0f2fe';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          // Outer rotating pulse
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(orb.x, oy, 14 + Math.sin(state.gameTime * 0.1) * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#e9d5ff';
          ctx.fill();
          
          // Rotating outer ring
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(orb.x, oy, 13 + Math.sin(state.gameTime * 0.1) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // 8. DRAW DYNAMIC SOLAR BEAMS (HAZARDS)
    state.lightBeams.forEach((beam: LightBeam) => {
      if (beam.active) {
        ctx.save();
        // Drawing a bright golden laser-like pillar
        const pulse = Math.sin(state.gameTime * 0.1) * 0.15;
        const beamGrad = ctx.createLinearGradient(beam.x, 0, beam.x + beam.w, 0);
        beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0.05)');
        beamGrad.addColorStop(0.3, `rgba(254, 240, 138, ${0.45 + pulse})`);
        beamGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.7 + pulse})`);
        beamGrad.addColorStop(0.7, `rgba(254, 240, 138, ${0.45 + pulse})`);
        beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0.05)');
        
        ctx.fillStyle = beamGrad;
        ctx.fillRect(beam.x, beam.y, beam.w, beam.h);
        
        // Outer glow
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.15)';
        ctx.lineWidth = 4;
        ctx.strokeRect(beam.x - 2, beam.y, beam.w + 4, beam.h);
        ctx.restore();
      }
    });

    // 9. DRAW SHADOW TELEPORT NODES
    state.shadowNodes.forEach((node: ShadowNode) => {
      if (!node.active) return;
      
      const isSelected = state.selectedNode && state.selectedNode.id === node.id;
      const pulse = Math.sin(state.gameTime * 0.07) * 3;
      const r = 10 + pulse;
      
      ctx.save();
      
      // Node center (deep violet cosmic eye)
      ctx.beginPath();
      ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.shadowColor = isSelected ? '#a855f7' : '#6366f1';
      ctx.shadowBlur = isSelected ? 18 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Swirling outer rings
      ctx.strokeStyle = isSelected ? 'rgba(168, 85, 247, 0.7)' : 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // If selected, draw connecting ray to the player
      if (isSelected) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(state.px + state.pw / 2, state.py + state.ph / 2);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw control prompt above player head
        ctx.fillStyle = '#f3e8ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("PRESS E", node.x, node.y - 24);
      }

      ctx.restore();
    });

    // 10. DRAW PUSHABLE STONE BLOCKS
    state.pushableBlocks.forEach((b: PushableBlock) => {
      ctx.save();
      // Heavy dark grey brick style
      ctx.fillStyle = '#374151';
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 3;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      
      // Engraving on the block to make it look mystical
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + 8, b.y + 8);
      ctx.lineTo(b.x + b.w - 8, b.y + b.h - 8);
      ctx.moveTo(b.x + b.w - 8, b.y + 8);
      ctx.lineTo(b.x + 8, b.y + b.h - 8);
      ctx.stroke();
      ctx.restore();
    });

    // 11. DRAW PHYSICAL PLATFORMS (Solid Terrain - Highly Polished)
    state.platforms.forEach((p: Platform) => {
      if (p.w === 0 || p.h === 0) return;
      
      ctx.save();
      
      // Gorgeous gradient fills and glowing accents for platforms
      let gradColorTop = '#1e293b';
      let gradColorBot = '#0f172a';
      let strokeStyle = '#334155';
      let accentGlow = '#64748b';
      
      if (p.type === 'grass') {
        gradColorTop = '#0f172a'; 
        gradColorBot = '#020617';
        strokeStyle = '#1e3a8a';
        accentGlow = '#3b82f6';
      } else if (p.type === 'wood') {
        gradColorTop = '#1e1b4b'; 
        gradColorBot = '#090514';
        strokeStyle = '#4c1d95';
        accentGlow = '#8b5cf6';
      } else if (p.type === 'crystal') {
        gradColorTop = '#083344'; 
        gradColorBot = '#021017';
        strokeStyle = '#0e7490';
        accentGlow = '#06b6d4';
      } else if (p.type === 'ruins') {
        gradColorTop = '#1c1917'; 
        gradColorBot = '#0c0a09';
        strokeStyle = '#44403c';
        accentGlow = '#a8a29e';
      } else if (p.type === 'danger') {
        gradColorTop = '#7c2d12'; 
        gradColorBot = '#431407';
        strokeStyle = '#ea580c';
        accentGlow = '#f97316';
      }
      
      const platformGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      platformGrad.addColorStop(0, gradColorTop);
      platformGrad.addColorStop(1, gradColorBot);
      
      ctx.fillStyle = platformGrad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      
      // Draw inner glowing bevel border with accent highlight
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      
      // Top accent glow line
      ctx.fillStyle = accentGlow;
      ctx.fillRect(p.x + 2, p.y, p.w - 4, 1.5);

      // Add elegant etched rune patterns / subterranean geometric rock cracks
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let stepX = p.x + 35; stepX < p.x + p.w - 20; stepX += 60) {
        const stepY = p.y + Math.min(20, p.h / 3);
        ctx.moveTo(stepX, p.y);
        ctx.lineTo(stepX - 8, stepY);
        ctx.lineTo(stepX + 12, stepY + Math.min(20, p.h / 3));
        if (p.h > 40) ctx.lineTo(stepX + 4, p.y + p.h);
      }
      ctx.stroke();

      // Draw aesthetic organic tops (highly detailed grass tufts, crystal clusters, magma spikes)
      if (p.type === 'grass' || p.type === 'wood' || p.type === 'normal') {
        if (progress < 0.35) {
          // Morning: Lush emerald grass tufts & blooming flowers
          ctx.fillStyle = '#10b981';
          ctx.fillRect(p.x, p.y, p.w, 4);
          // Individual grass tufts
          ctx.fillStyle = '#059669';
          for (let gx = p.x + 5; gx < p.x + p.w - 10; gx += 15) {
            ctx.beginPath(); ctx.moveTo(gx, p.y); ctx.lineTo(gx + 4, p.y - 5); ctx.lineTo(gx + 8, p.y); ctx.fill();
          }
          // Flowers
          ctx.fillStyle = '#f43f5e';
          for (let fx = p.x + 15; fx < p.x + p.w - 15; fx += 45) {
            ctx.beginPath(); ctx.arc(fx, p.y - 3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(fx, p.y - 3, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f43f5e';
          }
        } else if (progress <= 0.75) {
          // Noon: Sunbaked cracked earth, dry amber tufts
          ctx.fillStyle = '#b45309';
          ctx.fillRect(p.x, p.y, p.w, 4);
          ctx.fillStyle = '#92400e';
          for (let gx = p.x + 8; gx < p.x + p.w - 10; gx += 25) {
            ctx.beginPath(); ctx.moveTo(gx, p.y); ctx.lineTo(gx + 3, p.y - 4); ctx.lineTo(gx + 6, p.y); ctx.fill();
          }
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let cx = p.x + 25; cx < p.x + p.w - 25; cx += 50) {
            ctx.moveTo(cx, p.y); ctx.lineTo(cx + 4, p.y + 10); ctx.lineTo(cx - 3, p.y + 18);
          }
          ctx.stroke();
        } else {
          // Evening: Recovering twilight moss, glowing bioluminescent flowers
          ctx.fillStyle = '#059669';
          ctx.fillRect(p.x, p.y, p.w, 4);
          ctx.fillStyle = '#a78bfa';
          for (let fx = p.x + 15; fx < p.x + p.w - 15; fx += 40) {
            ctx.beginPath(); ctx.arc(fx, p.y - 2, 2.5, 0, Math.PI * 2); ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
          }
        }
      } else if (p.type === 'crystal') {
        // Detailed crystal facets and cyan edge glow
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(p.x, p.y, p.w, 3);
        ctx.fillStyle = '#22d3ee';
        for (let cx = p.x + 10; cx < p.x + p.w - 15; cx += 35) {
          ctx.beginPath(); ctx.moveTo(cx, p.y); ctx.lineTo(cx + 6, p.y - 8); ctx.lineTo(cx + 12, p.y); ctx.fill();
        }
      } else if (p.type === 'danger') {
        // Layered glowing magma spikes
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        for (let sx = p.x; sx < p.x + p.w; sx += 12) {
          ctx.moveTo(sx, p.y + p.h); ctx.lineTo(sx + 6, p.y); ctx.lineTo(sx + 12, p.y + p.h);
        }
        ctx.fill();
        // Inner bright yellow-orange core spikes
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        for (let sx = p.x + 2; sx < p.x + p.w - 2; sx += 12) {
          ctx.moveTo(sx, p.y + p.h); ctx.lineTo(sx + 5, p.y + 4); ctx.lineTo(sx + 10, p.y + p.h);
        }
        ctx.fill();
      } else if (p.type === 'ruins') {
        // Ancient embossed temple blocks
        ctx.fillStyle = '#44403c';
        ctx.fillRect(p.x, p.y, p.w, 4);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2;
        for (let rx = p.x + 10; rx < p.x + p.w - 15; rx += 30) {
          ctx.strokeRect(rx, p.y + 6, 20, Math.min(15, p.h - 10));
        }
      }
      
      ctx.restore();
    });

    // 12. DRAW MOVING PLATFORMS (Swaying Branches / Spinning Bars)
    state.movingObjects.forEach((mo: MovingObject) => {
      ctx.save();
      
      if (mo.type === 'branch' || mo.type === 'elevator') {
        const mx = mo.startX + Math.sin(state.gameTime * mo.speed + (mo.phase || 0)) * mo.rangeX;
        const my = mo.startY + Math.sin(state.gameTime * mo.speed + (mo.phase || 0)) * mo.rangeY;
        
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#4a044e';
        ctx.lineWidth = 2.5;
        ctx.fillRect(mx, my, mo.w, mo.h);
        ctx.strokeRect(mx, my, mo.w, mo.h);
        
        // Add purple foliage/leaf blobs
        ctx.fillStyle = 'rgba(112, 26, 117, 0.45)';
        ctx.beginPath();
        ctx.arc(mx + mo.w / 2, my + mo.h / 2, 25, 0, Math.PI * 2);
        ctx.fill();
      } else if (mo.type === 'spinning_bar') {
        // Draw spinning bar centered around (startX, startY)
        ctx.translate(mo.startX, mo.startY);
        const angle = (mo.angle || 0) + state.gameTime * (mo.rotationSpeed || 0);
        ctx.rotate(angle);
        
        ctx.fillStyle = '#2e1065';
        ctx.strokeStyle = '#701a75';
        ctx.lineWidth = 3;
        ctx.fillRect(-mo.w / 2, -mo.h / 2, mo.w, mo.h);
        ctx.strokeRect(-mo.w / 2, -mo.h / 2, mo.w, mo.h);
        
        // Swirling core center
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#d8b4fe';
        ctx.fill();
      }
      
      ctx.restore();
    });

    // 13. DRAW ANCIENT ECLIPSE GATE (Level 5) OR PORTAL ARCHWAYS
    const goalX = state.level.goalX;
    const goalY = state.level.goalY;
    
    ctx.save();
    if (state.level.id === 5) {
      // The massive magnificent Eclipse Gate
      const gateWidth = 120;
      const gateHeight = 160;
      const gx = goalX - gateWidth / 2;
      const gy = goalY - gateHeight;
      
      // Draw stone pillars
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 4;
      ctx.fillRect(gx, gy, 20, gateHeight);
      ctx.fillRect(gx + gateWidth - 20, gy, 20, gateHeight);
      // Top lintel
      ctx.fillRect(gx - 10, gy, gateWidth + 20, 25);
      ctx.strokeRect(gx, gy, 20, gateHeight);
      ctx.strokeRect(gx + gateWidth - 20, gy, 20, gateHeight);
      ctx.strokeRect(gx - 10, gy, gateWidth + 20, 25);
      
      // Swirling golden stellar portal inside the gate
      ctx.beginPath();
      ctx.rect(gx + 20, gy + 25, gateWidth - 40, gateHeight - 25);
      ctx.clip();
      
      // Draw black star vortex
      const grad = ctx.createRadialGradient(goalX, goalY - gateHeight / 2, 10, goalX, goalY - gateHeight / 2, 70);
      grad.addColorStop(0, '#090514');
      grad.addColorStop(0.5, '#3b0764');
      grad.addColorStop(1, '#ea580c'); // Ring of fire
      ctx.fillStyle = grad;
      ctx.fillRect(gx + 20, gy + 25, gateWidth - 40, gateHeight - 25);
      
      // Swirling particles inside vortex
      ctx.fillStyle = '#ffedd5';
      for (let i = 0; i < 8; i++) {
        const radius = 25 + Math.sin(state.gameTime * 0.03 + i) * 15;
        const angle = state.gameTime * 0.04 + i * (Math.PI / 4);
        const px = goalX + Math.cos(angle) * radius;
        const py = (goalY - gateHeight / 2) + Math.sin(angle) * radius * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Standard glowing dark portal archway
      const archW = 60;
      const archH = 90;
      const ax = goalX - archW / 2;
      const ay = goalY - archH;
      
      // Draw arch
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay + archH);
      ctx.lineTo(ax, ay + archW / 2);
      ctx.arc(ax + archW / 2, ay + archW / 2, archW / 2, Math.PI, 0, false);
      ctx.lineTo(ax + archW, ay + archH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cosmic glow center
      const portalGrad = ctx.createRadialGradient(goalX, ay + archH / 2, 2, goalX, ay + archH / 2, archW / 2);
      portalGrad.addColorStop(0, '#701a75');
      portalGrad.addColorStop(0.7, '#1e1b4b');
      portalGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = portalGrad;
      ctx.beginPath();
      ctx.arc(goalX, ay + archH / 2, archW / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 14. DRAW PARTICLES (Trails, Sparks, Dust)
    state.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 15. DRAW THE PLAYER (LIVING SHADOW SPIRIT - Elegant, Sympathetic, Memorable)
    ctx.save();
    
    if (state.teleportActive) {
      // Draw dissolving teleport fragments
      state.teleportFragments.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    } else {
      // ------ ANIMATION STATE ------
      // Squash & stretch response
      let stretchX = 1.0;
      let stretchY = 1.0;
      let floatOffsetY = 0;
      
      // Shadow Evolution base scale (Solstice affects physical size)
      let baseScale = 1.0;
      if (progress < 0.35) {
        baseScale = 1.25; // Morning: Large shadow body
      } else if (progress <= 0.75) {
        baseScale = 0.78; // Noon: Compact silhouette
      } else {
        baseScale = 1.08; // Evening: Shadow returns, fuller
      }

      if (state.dashActive) {
        stretchX = 1.55;
        stretchY = 0.55;
      } else if (state.jumpAnticipationTimer > 0) {
        // Squash before jump
        stretchX = 1.3;
        stretchY = 0.7;
      } else if (state.landingTimer > 0) {
        // Land: horizontal squash then recover
        stretchX = 1.45;
        stretchY = 0.65;
      } else if (!state.isGrounded) {
        const velRatio = Math.min(1.0, Math.abs(state.vy) / 8);
        // Vertical stretch while airborne
        stretchY = 1.0 + velRatio * 0.22;
        stretchX = 1.0 - velRatio * 0.12;
      } else if (Math.abs(state.vx) > 0.5) {
        // Running: energetic forward lean and bouncy squash
        stretchX = 1.06 + Math.sin(state.gameTime * 0.32) * 0.07;
        stretchY = 1.0 - Math.sin(state.gameTime * 0.32) * 0.05;
      } else {
        // IDLE: breathing, floating, soft wobble
        stretchY = 1.0 + Math.sin(state.gameTime * 0.085) * 0.06;
        stretchX = 1.0 - Math.sin(state.gameTime * 0.085) * 0.04;
        floatOffsetY = Math.sin(state.gameTime * 0.05) * 1.5;
      }

      const px = state.px + state.pw / 2;
      const py = state.py + state.ph / 2 + floatOffsetY;

      // Subtle living wobble micro-deformation (organic feel, barely noticeable)
      const wobble = Math.sin(state.gameTime * 0.6 + state.microSeed) * 0.4;

      // --- Ghost afterimage rendering (running/dash trails) ---
      if (Math.abs(state.vx) > 2.5 || state.dashActive) {
        const trailCount = state.dashActive ? 9 : 5;
        for (let i = 1; i <= trailCount; i++) {
          const tFactor = state.dashActive ? 1.3 : 0.9;
          const ghostX = px - state.vx * i * tFactor;
          const ghostY = py - state.vy * i * tFactor;
          ctx.save();
          ctx.translate(ghostX, ghostY);
          ctx.rotate((state.dashActive ? state.facingDir * 0.18 : Math.max(-0.12, Math.min(0.12, state.vx * 0.025))));
          const trailScale = 1 - i * 0.12;
          ctx.scale(stretchX * state.facingDir * baseScale * trailScale, stretchY * baseScale * trailScale);
          
          // Soft, simplified afterimage blob
          ctx.beginPath();
          ctx.moveTo(0, -state.ph / 2 - 4);
          ctx.bezierCurveTo(state.pw * 0.6, -state.ph * 0.4, state.pw * 0.55, state.ph * 0.2, state.pw * 0.35, state.ph * 0.45);
          ctx.bezierCurveTo(state.pw * 0.15, state.ph * 0.55, -state.pw * 0.15, state.ph * 0.55, -state.pw * 0.35, state.ph * 0.45);
          ctx.bezierCurveTo(-state.pw * 0.55, state.ph * 0.2, -state.pw * 0.6, -state.ph * 0.4, 0, -state.ph / 2 - 4);
          ctx.closePath();
          
          const fadeAlpha = (1 - i / (trailCount + 1)) * 0.45;
          ctx.fillStyle = state.dashActive 
            ? `rgba(147, 51, 234, ${fadeAlpha})` 
            : `rgba(30, 27, 75, ${fadeAlpha * 0.7})`;
          ctx.fill();
          ctx.restore();
        }
      }

      // --- 2.5D Depth: render back layers first, then main body, then rim ---
      // Helper to draw a single layer of the elegant spirit body
      const drawSpiritLayer = (offsetY: number, alpha: number, fillColor: string | 'main') => {
        ctx.save();
        ctx.translate(0, offsetY);
        
        // Body path: soft rounded teardrop / pearl shape, friendly & iconic
        ctx.beginPath();
        ctx.moveTo(0, -state.ph / 2 - 2 + wobble * 0.5);
        // Right curve
        ctx.bezierCurveTo(
          state.pw * 0.55, -state.ph * 0.4,
          state.pw * 0.65, state.ph * 0.1,
          state.pw * 0.4, state.ph * 0.45
        );
        // Bottom right
        ctx.bezierCurveTo(
          state.pw * 0.2, state.ph * 0.55,
          -state.pw * 0.2, state.ph * 0.55,
          -state.pw * 0.4, state.ph * 0.45
        );
        // Left curve
        ctx.bezierCurveTo(
          -state.pw * 0.65, state.ph * 0.1,
          -state.pw * 0.55, -state.ph * 0.4,
          0, -state.ph / 2 - 2 + wobble * 0.5
        );
        ctx.closePath();

        if (fillColor === 'main') {
          // Rich body gradient: deep navy → midnight → near-black indigo
          const bodyGrad = ctx.createRadialGradient(0, -state.ph * 0.1, 2, 0, 0, state.ph);
          bodyGrad.addColorStop(0, '#312e81'); // dark indigo
          bodyGrad.addColorStop(0.55, '#1e1b4b'); // midnight
          bodyGrad.addColorStop(1, '#0c0a1e');  // near-black
          ctx.fillStyle = bodyGrad;
          ctx.fill();
        } else {
          ctx.fillStyle = fillColor;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      };

      // Position the entire character
      ctx.translate(px, py);
      const lean = state.dashActive 
        ? state.facingDir * 0.18 
        : Math.max(-0.12, Math.min(0.12, state.vx * 0.025));
      ctx.rotate(lean);
      ctx.scale(stretchX * state.facingDir * baseScale, stretchY * baseScale);

      // Render the 3 depth layers (back to front)
      drawSpiritLayer(0, 1, '#1e1b4b'); // back wash
      drawSpiritLayer(0, 1, 'main');
      drawSpiritLayer(0, 1, '#3730a3'); // forward rim highlight

      // Outer glow / rim lighting - subtle warm tone when near sunlight, cool when in shadow
      const rimColor = !state.inShadow && !state.dashActive ? '#fb923c' : '#a78bfa';
      const rimBlur = !state.inShadow && !state.dashActive ? 8 : 4;
      ctx.save();
      ctx.shadowColor = rimColor;
      ctx.shadowBlur = rimBlur;
      ctx.beginPath();
      ctx.moveTo(0, -state.ph / 2 - 2 + wobble * 0.5);
      ctx.bezierCurveTo(state.pw * 0.55, -state.ph * 0.4, state.pw * 0.65, state.ph * 0.1, state.pw * 0.4, state.ph * 0.45);
      ctx.bezierCurveTo(state.pw * 0.2, state.ph * 0.55, -state.pw * 0.2, state.ph * 0.55, -state.pw * 0.4, state.ph * 0.45);
      ctx.bezierCurveTo(-state.pw * 0.65, state.ph * 0.1, -state.pw * 0.55, -state.ph * 0.4, 0, -state.ph / 2 - 2 + wobble * 0.5);
      ctx.closePath();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rimColor;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // --- EYES: Soulful glowing eyes that react to environment ---
      // Eye intelligence system:
      // - In shadow: calm soft glow
      // - Near bright light: widen, glow brightens
      // - Low energy: dim and flicker
      // - Final eclipse: bright and confident
      const energy = state.shadowEnergy / 100;
      const danger = (!state.inShadow && !state.dashActive) ? 1 : 0;

      // Eye widening near light
      const eyeSizeBase = 3.0 + danger * 1.0;
      const eyeGlowBoost = 1.0 + danger * 0.6 - (1 - energy) * 0.5;
      
      // Blink logic
      if (state.isBlinking) {
        const blinkAge = state.gameTime - state.blinkStartTime;
        if (blinkAge > 8) {
          state.isBlinking = false;
        }
      } else {
        state.blinkTimer++;
        // Faster blinks when calm/dangerous, rarer when safe
        const blinkInterval = 120 + Math.floor(Math.random() * 180);
        if (state.blinkTimer > blinkInterval) {
          state.isBlinking = true;
          state.blinkStartTime = state.gameTime;
          state.blinkTimer = 0;
        }
      }
      // Apply blink (vertical squish)
      const blinkSquish = state.isBlinking ? 0.15 : 1.0;
      
      // Eye color: cyan in shadow, warm orange in danger, dim purple when low energy
      let eyeColor = state.inShadow ? '#22d3ee' : '#fb923c';
      let eyeShadowColor = state.inShadow ? '#06b6d4' : '#ea580c';
      if (energy < 0.25 && state.inShadow) {
        // Critical: dim and flicker
        eyeColor = Math.random() > 0.3 ? '#a78bfa' : '#5b21b6';
        eyeShadowColor = '#3730a3';
      }
      
      // Eye position: slightly apart, looking forward
      const eyeBaseY = -state.ph * 0.18;
      const eyeSpacing = 4.5;
      const eyeY = eyeBaseY;
      
      // Determine horizontal eye position based on facing direction (eyes look in moving direction)
      const eyeLookX = state.facingDir * 1.2;
      
      ctx.save();
      ctx.fillStyle = eyeColor;
      ctx.shadowColor = eyeShadowColor;
      ctx.shadowBlur = 6 + danger * 6;
      
      // Left eye (small soft oval)
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing + eyeLookX, eyeY, eyeSizeBase, eyeSizeBase * blinkSquish, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Right eye
      ctx.beginPath();
      ctx.ellipse(eyeSpacing + eyeLookX, eyeY, eyeSizeBase, eyeSizeBase * blinkSquish, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Bright eye core highlight (white dot for life)
      if (energy > 0.3) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.85 * eyeGlowBoost;
        ctx.beginPath();
        ctx.arc(-eyeSpacing + eyeLookX - 0.5, eyeY - 0.8, 0.8, 0, Math.PI * 2);
        ctx.arc(eyeSpacing + eyeLookX - 0.5, eyeY - 0.8, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- Soft living darkness wisps (shadow particles drifting off the body) ---
      // Drift upward and behind, giving the sense of "made of darkness"
      ctx.save();
      ctx.fillStyle = '#4338ca';
      for (let i = 0; i < 3; i++) {
        const t = state.gameTime * 0.02 + i * 2.1;
        const wx = Math.sin(t) * 8;
        const wy = -state.ph * 0.5 - i * 4 - Math.abs(Math.sin(t * 0.7)) * 6;
        const wAlpha = 0.35 - i * 0.1;
        ctx.globalAlpha = wAlpha;
        ctx.beginPath();
        ctx.arc(wx, wy, 2.5 - i * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // --- Scarves/tendrils replaced with soft shadow wisps at the base (no scarf neck) ---
      ctx.save();
      ctx.fillStyle = '#1e1b4b';
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 2; i++) {
        const t = state.gameTime * 0.04 + i;
        const angle = Math.PI + 0.4 + (i * 0.5) + Math.sin(t) * 0.3;
        const length = 8 + Math.sin(t * 0.8) * 3;
        const tx = Math.cos(angle) * length;
        const ty = Math.sin(angle) * length;
        ctx.beginPath();
        ctx.arc(tx, ty + state.ph * 0.45, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.restore();
    }

    // Spawn protection text indicator
    if (state.protectionTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      ctx.fillText("Shadow Stabilizing...", state.px + state.pw / 2, state.py - 15);
      ctx.restore();
    }

    // 16. TUTORIAL PROMPTS / LABELS ON SCREEN
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'normal 13px sans-serif';
    ctx.textAlign = 'center';
    
    state.platforms.forEach((p: Platform) => {
      if (p.label) {
        // Draw the text nicely in world space, centered above the coordinates
        ctx.fillText(p.label, p.x, p.y);
      }
    });

    ctx.restore(); // Restore world-space transform
    ctx.restore(); // Restore screen-shake/cam transform

    // Foreground silhouettes create depth without affecting gameplay.
    drawForegroundLayer(ctx, screenW, screenH, progress);

    // 17. SCENIC TRANSITION OVERLAYS
    // Renders a fade overlay and then triggers the actual level change ONCE.
    if (state.transitionTimer > 0 && state.transitionTimer < 99) {
      state.transitionTimer += 0.03; // Smooth fade over ~33 frames (~0.55s)
      
      ctx.save();
      const fadeAlpha = Math.min(1.0, state.transitionTimer);
      ctx.fillStyle = `rgba(20, 15, 50, ${fadeAlpha})`;
      ctx.fillRect(0, 0, screenW, screenH);
      
      if (state.transitionTimer > 0.3) {
        const textAlpha = Math.min(1, (state.transitionTimer - 0.3) * 2);
        ctx.fillStyle = `rgba(254, 240, 138, ${textAlpha})`;
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 15;
        ctx.fillText("Ascending to Next Solstice Region...", screenW / 2, screenH / 2);
        
        ctx.font = 'italic 14px sans-serif';
        ctx.fillStyle = `rgba(203, 213, 225, ${textAlpha})`;
        ctx.shadowBlur = 0;
        ctx.fillText("The Sun climbs higher, but your shadow grows braver.", screenW / 2, screenH / 2 + 35);
      }
      ctx.restore();
      
      // Fire onLevelComplete exactly once when the fade is nearly complete
      if (state.transitionTimer >= 0.95 && !isEndlessRef.current) {
        state.transitionTimer = 99; // Mark as "fired" so we never call again
        onLevelCompleteRef.current(levelIndexRef.current + 1);
      }
    }
  };

  // Draw mountain range backgrounds for parallax depth
  const drawParallaxLayer = (ctx: CanvasRenderingContext2D, levelId: number, levelWidth: number, layerType: 'far' | 'mid' | 'near' = 'far') => {
    ctx.save();
    
    // Choose colors based on the level ID and layer type
    let colFar = 'rgba(20, 25, 45, 0.4)';
    let colNear = 'rgba(15, 20, 35, 0.6)';
    
    // Adjust opacity and detail based on layer depth
    const opacityMult = layerType === 'far' ? 0.5 : (layerType === 'mid' ? 0.75 : 1.0);
    const detailMult = layerType === 'far' ? 0.6 : (layerType === 'mid' ? 0.85 : 1.0);
    
    if (levelId === 1) { // Meadow
      colFar = `rgba(59, 24, 114, ${0.35 * opacityMult})`;
      colNear = `rgba(30, 20, 70, ${0.5 * opacityMult})`;
    } else if (levelId === 2) { // Forest
      colFar = `rgba(29, 53, 87, ${0.4 * opacityMult})`;
      colNear = `rgba(20, 38, 64, ${0.6 * opacityMult})`;
    } else if (levelId === 3) { // Crystals
      colFar = `rgba(8, 48, 66, ${0.35 * opacityMult})`;
      colNear = `rgba(5, 30, 48, ${0.55 * opacityMult})`;
    } else if (levelId === 4) { // Desert
      colFar = `rgba(180, 83, 9, ${0.25 * opacityMult})`;
      colNear = `rgba(124, 45, 18, ${0.45 * opacityMult})`;
    } else if (levelId === 5) { // Summit
      colFar = `rgba(88, 28, 135, ${0.3 * opacityMult})`;
      colNear = `rgba(59, 7, 100, ${0.5 * opacityMult})`;
    }

    // Far mountains (larger curves, less detail for distant layers)
    ctx.fillStyle = colFar;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    const farStep = 150 / detailMult;
    for (let x = 0; x <= levelWidth + 800; x += farStep) {
      const y = 300 + Math.sin(x * 0.0015 * detailMult) * 80 + Math.cos(x * 0.0005 * detailMult) * 40;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(levelWidth + 800, 600);
    ctx.closePath();
    ctx.fill();

    // Near mountains/forest line (denser peaks, more detail for closer layers)
    ctx.fillStyle = colNear;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    const nearStep = 80 / detailMult;
    for (let x = 0; x <= levelWidth + 800; x += nearStep) {
      const y = 380 + Math.sin(x * 0.004 * detailMult) * 40 + Math.sin(x * 0.001 * detailMult) * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(levelWidth + 800, 600);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawForegroundLayer = (ctx: CanvasRenderingContext2D, screenW: number, screenH: number, progress: number) => {
    ctx.save();
    const baseY = screenH - 18;
    const alpha = progress > 0.35 && progress < 0.75 ? 0.34 : 0.46;
    ctx.globalAlpha = alpha;

    // Small rocks and grass silhouettes move with screen space to add depth in front of the camera.
    ctx.fillStyle = progress > 0.75 ? '#111827' : '#080814';
    for (let x = -20; x < screenW + 40; x += 46) {
      const h = 10 + Math.sin((x + stateRef.current.gameTime) * 0.03) * 4;
      ctx.beginPath();
      ctx.moveTo(x, screenH);
      ctx.lineTo(x + 7, baseY - h);
      ctx.lineTo(x + 13, screenH);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = alpha * 0.7;
    for (let x = 20; x < screenW; x += 140) {
      ctx.beginPath();
      ctx.ellipse(x, screenH - 8, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Draw the Solstice Sun and gorgeous volumetric light shafts
  const drawSunAndLightRays = (ctx: CanvasRenderingContext2D, state: any, screenW: number) => {
    ctx.save();
    
    // Sun position: based on the light angle, the sun is positioned on the opposite side.
    // We place it at a virtual coordinate in screen space.
    const sunAngle = state.sunAngle;
    
    // The sun is placed above the screen. 
    // In morning (angle ~0.4), sun is on left, shining down-right.
    // In afternoon (angle ~1.3), sun is on right, shining down-left.
    // In zenith (angle ~1.5), sun is directly overhead.
    const sunDist = 350;
    const sunX = screenW / 2 - Math.cos(sunAngle) * sunDist;
    const sunY = 90 - Math.sin(sunAngle) * 50;

    // Draw solar rays (semi-transparent glowing wedges)
    const numRays = 8;
    ctx.globalCompositeOperation = 'screen';
    
    for (let i = 0; i < numRays; i++) {
      const rayAngle = sunAngle + Math.PI + (i - numRays / 2) * 0.06 + Math.sin(state.gameTime * 0.015 + i) * 0.01;
      const rayWidth = 0.08 + Math.sin(state.gameTime * 0.02 + i) * 0.02;
      
      const p1 = {
        x: sunX + Math.cos(rayAngle - rayWidth) * 2000,
        y: sunY + Math.sin(rayAngle - rayWidth) * 2000
      };
      const p2 = {
        x: sunX + Math.cos(rayAngle + rayWidth) * 2000,
        y: sunY + Math.sin(rayAngle + rayWidth) * 2000
      };

      const rayGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 900);
      rayGrad.addColorStop(0, `rgba(255, 240, 200, ${0.15 * state.sunIntensity})`);
      rayGrad.addColorStop(0.3, `rgba(255, 240, 200, ${0.06 * state.sunIntensity})`);
      rayGrad.addColorStop(1, 'rgba(255, 240, 200, 0)');
      
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fill();
    }

    // Draw the Sun itself (layered glowing corona)
    ctx.globalCompositeOperation = 'source-over';
    
    // Outer glow
    const sunGlow1 = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 70);
    sunGlow1.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    sunGlow1.addColorStop(0.2, 'rgba(254, 240, 138, 0.6)'); // Yellow-200
    sunGlow1.addColorStop(0.6, 'rgba(249, 115, 22, 0.25)'); // Orange-500
    sunGlow1.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sunGlow1;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();

    // Blinding core
    ctx.beginPath();
    ctx.arc(sunX, sunY, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  };

  // =========================================================================
  // USER ACTIONS (FOR MOBILE CONTROLS AND TOUCH SCREEN)
  // =========================================================================
  const handleMobileMove = (dir: 'left' | 'right' | 'stop') => {
    const state = stateRef.current;
    if (dir === 'left') {
      state.keys.a = true;
      state.keys.d = false;
    } else if (dir === 'right') {
      state.keys.d = true;
      state.keys.a = false;
    } else {
      state.keys.a = false;
      state.keys.d = false;
    }
  };

  const handleMobileJump = () => {
    const state = stateRef.current;
    state.keys.Space = true;
    setTimeout(() => {
      state.keys.Space = false;
    }, 100);
  };

  const handleMobileDash = () => {
    const state = stateRef.current;
    state.keys.Shift = true;
    setTimeout(() => {
      state.keys.Shift = false;
    }, 100);
  };

  const handleMobileTeleport = () => {
    const state = stateRef.current;
    state.keys.e = true;
    setTimeout(() => {
      state.keys.e = false;
    }, 100);
  };

  const handleRestartLevel = () => {
    const state = stateRef.current;
    state.px = state.level.startX;
    state.py = state.level.startY;
    state.vx = 0;
    state.vy = 0;
    state.shadowEnergy = 100;
    state.inShadow = true;
    state.checkpointX = state.level.startX;
    state.checkpointY = state.level.startY;
    state.activeCheckpointId = '';
    state.protectionTimer = 180;
    state.teleportActive = false;
    state.teleportTimer = 0;
    state.jumpAnticipationTimer = 0;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    state.jumpHeldLast = false;
    state.jumpCutAvailable = false;
    state.landingTimer = 0;
    state.checkpoints.forEach(cp => cp.activated = false);
    state.orbs.forEach(o => o.collected = false);
    // Reset block positions
    state.pushableBlocks = JSON.parse(JSON.stringify(state.level.pushableBlocks));
    
    audio.playCheckpoint();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none" ref={containerRef}>
      {/* Top Hud Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        
        {/* Shadow Energy HUD */}
        <div className="flex flex-col items-start gap-1 pointer-events-auto">
          <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold tracking-wider uppercase">
            <Zap className={`w-3.5 h-3.5 ${stateRef.current.inShadow ? 'animate-pulse' : 'text-orange-400'}`} />
            <span>Shadow Essence</span>
          </div>
          <div className="w-48 h-3 bg-slate-950/80 rounded-full border border-indigo-950 overflow-hidden flex p-0.5 shadow-lg">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                stateRef.current.shadowEnergy > 30 
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' 
                  : 'bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
              }`}
              style={{ width: `${stateRef.current.shadowEnergy}%` }}
            />
          </div>
        </div>

        {/* Level Name & Solstice Timer */}
        <div className="flex flex-col items-center text-center">
          <span className="text-xs text-orange-200/80 font-medium tracking-wide">
            {stateRef.current.level.regionName}
          </span>
          <h2 className="text-sm font-semibold text-white tracking-widest uppercase">
            {stateRef.current.level.name}
          </h2>
          {/* Dynamic Solstice Progress Indicator */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-amber-200 font-mono tracking-wider">☀</span>
            <div className="w-28 h-px bg-gradient-to-r from-amber-400/30 via-amber-300 to-amber-400/30 rounded-full relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-200 transition-all duration-500"
                style={{ width: `${(solsticeProgress || 0) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-purple-300 font-mono tracking-wider">🌑</span>
          </div>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => onPauseToggle(!isPaused)}
            className="p-2 bg-slate-950/80 hover:bg-slate-900 border border-indigo-950 rounded-lg text-slate-300 hover:text-white transition shadow-md"
            title="Pause Game (Esc)"
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={handleRestartLevel}
            className="p-2 bg-slate-950/80 hover:bg-slate-900 border border-indigo-950 rounded-lg text-slate-300 hover:text-white transition shadow-md"
            title="Restart Checkpoint"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenHelp}
            className="p-2 bg-slate-950/80 hover:bg-slate-900 border border-indigo-950 rounded-lg text-slate-300 hover:text-white transition shadow-md"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onMuteToggle}
            className="p-2 bg-slate-950/80 hover:bg-slate-900 border border-indigo-950 rounded-lg text-slate-300 hover:text-white transition shadow-md"
            title="Mute/Unmute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Lore Overlay Banner */}
      {showLore && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-lg w-[90%] p-4 bg-slate-950/90 border border-indigo-950 rounded-xl shadow-2xl backdrop-blur-md text-center z-20 animate-fade-in pointer-events-none">
          <div className="flex justify-center mb-1 text-purple-400">
            <Orbit className="w-4 h-4 animate-spin-slow" />
          </div>
          <p className="text-slate-200 text-xs md:text-sm italic leading-relaxed font-serif">
            "{showLore}"
          </p>
        </div>
      )}

      {/* Mobile Controls (Only visible on touch devices) */}
      {isMobile && (
        <div className="absolute bottom-6 left-0 right-0 px-8 py-3 z-20 flex justify-between items-center pointer-events-none select-none">
          {/* Left Joystick Area */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onTouchStart={() => handleMobileMove('left')}
              onTouchEnd={() => handleMobileMove('stop')}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950/85 border-2 border-indigo-600 active:bg-indigo-800 active:scale-95 rounded-full flex items-center justify-center text-white font-bold select-none text-2xl shadow-[0_4px_20px_rgba(79,70,229,0.4)]"
            >
              ←
            </button>
            <button
              onTouchStart={() => handleMobileMove('right')}
              onTouchEnd={() => handleMobileMove('stop')}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950/85 border-2 border-indigo-600 active:bg-indigo-800 active:scale-95 rounded-full flex items-center justify-center text-white font-bold select-none text-2xl shadow-[0_4px_20px_rgba(79,70,229,0.4)]"
            >
              →
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-4 pointer-events-auto">
            {/* Teleport Button (E) */}
            {stateRef.current.level.id >= 3 && (
              <button
                onTouchStart={handleMobileTeleport}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center text-xs font-bold shadow-lg transition select-none ${
                  stateRef.current.selectedNode 
                    ? 'bg-purple-900/95 border-purple-400 text-white animate-pulse shadow-[0_0_15px_rgba(192,132,252,0.6)]' 
                    : 'bg-slate-950/70 border-slate-800 text-slate-500'
                }`}
              >
                <span>T-PORT</span>
                <span className="text-[9px] font-mono">(E)</span>
              </button>
            )}

            {/* Dash Button (Shift) */}
            {stateRef.current.level.id >= 2 && (
              <button
                onTouchStart={handleMobileDash}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-950/95 border-2 border-indigo-500 active:bg-indigo-700 rounded-full flex flex-col items-center justify-center text-xs text-white font-bold shadow-[0_4px_15px_rgba(99,102,241,0.5)] select-none"
              >
                <span>DASH</span>
                <span className="text-[9px] font-mono">(SHIFT)</span>
              </button>
            )}

            {/* Jump Button (Space) */}
            <button
              onTouchStart={handleMobileJump}
              className="w-18 h-18 sm:w-20 sm:h-20 bg-blue-900/95 border-2 border-blue-400 active:bg-blue-600 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-[0_4px_20px_rgba(59,130,246,0.6)] select-none"
            >
              <span className="text-base font-extrabold">JUMP</span>
              <span className="text-[9px] font-mono">(SPACE)</span>
            </button>
          </div>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-fade-in pointer-events-auto">
          <div className="bg-slate-900/95 border border-indigo-950/60 p-8 rounded-2xl max-w-md w-[90%] text-center shadow-2xl flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-orange-400">
              <Orbit className="w-8 h-8 animate-spin-slow" />
              <h3 className="text-xl font-bold font-serif tracking-wide text-white">SOLSTICE PAUSED</h3>
            </div>
            <p className="text-xs text-slate-400 font-serif italic">
              "The sun stands still, yet time continues to slip away. Adapt, and survive."
            </p>

            {/* Volume control */}
            <div className="w-full flex flex-col gap-2 bg-slate-950/50 p-4 rounded-xl border border-slate-950">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-1.5">
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-450" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                  <span>Volume Controls</span>
                </div>
                <span className="text-indigo-350 font-mono">{isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={onMuteToggle}
                  className="text-xs px-2.5 py-1 bg-slate-900 border border-indigo-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md transition"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
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

            {/* Menu options */}
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => onPauseToggle(false)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition shadow-[0_4px_12px_rgba(79,70,229,0.3)] text-sm uppercase tracking-wider animate-pulse"
              >
                Resume Journey
              </button>
              <button
                onClick={handleRestartLevel}
                className="w-full py-2.5 bg-slate-950 border border-indigo-950 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold rounded-xl transition text-sm"
              >
                Restart Checkpoint
              </button>
              <button
                onClick={onOpenHelp}
                className="w-full py-2.5 bg-slate-950 border border-indigo-950 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold rounded-xl transition text-sm"
              >
                How to Play & Controls
              </button>
              <button
                onClick={onBackToMenu}
                className="w-full mt-2 py-2.5 bg-slate-950 border border-red-950 hover:bg-red-950/20 text-red-400 hover:text-red-300 font-semibold rounded-xl transition text-sm flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Exit to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
