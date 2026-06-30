export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: 'normal' | 'grass' | 'wood' | 'crystal' | 'sand' | 'ruins' | 'danger';
  label?: string;
}

export interface MovingObject {
  id: string;
  type: 'cloud' | 'branch' | 'spinning_bar' | 'elevator';
  startX: number;
  startY: number;
  w: number;
  h: number;
  speed: number;
  rangeX: number;
  rangeY: number;
  phase?: number;
  rotationSpeed?: number;
  angle?: number;
}

export interface LightBeam {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  blockerId?: string;
}

export interface ShadowNode {
  id: string;
  x: number;
  y: number;
  active: boolean;
}

export interface CollectibleOrb {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  type: 'energy' | 'lore';
  loreText?: string;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  activated: boolean;
}

export interface PushableBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export interface Level {
  id: number;
  name: string;
  regionName: string;
  description: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  goalX: number;
  goalY: number;
  sunAngle: number;
  sunIntensity: number;
  skyColors: string[];
  ambientDarkness: number;
  platforms: Platform[];
  movingObjects: MovingObject[];
  lightBeams: LightBeam[];
  shadowNodes: ShadowNode[];
  orbs: CollectibleOrb[];
  checkpoints: Checkpoint[];
  pushableBlocks: PushableBlock[];
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "Dawn's First Awakening",
    regionName: "Whispering Meadow",
    description: "A gentle meadow with long morning shadows. Learn movement, jumping, and safe shadow routing before the day grows harsh.",
    width: 6100,
    height: 650,
    startX: 90,
    startY: 484,
    goalX: 5920,
    goalY: 500,
    sunAngle: 0.35,
    sunIntensity: 0.3,
    skyColors: ['#2b1055', '#ff8fab', '#ffd166'],
    ambientDarkness: 0.2,
    platforms: [
      { x: 0, y: 520, w: 720, h: 90, type: 'grass' },
      { x: 110, y: 390, w: 0, h: 0, label: "A/D or ARROW KEYS to move. SPACE to jump." },
      { x: 440, y: 390, w: 0, h: 0, label: "Stay in shade to restore Shadow Essence." },
      { x: 360, y: 435, w: 90, h: 85, type: 'grass' },
      { x: 560, y: 455, w: 110, h: 65, type: 'grass' },
      { x: 820, y: 520, w: 520, h: 90, type: 'grass' },
      { x: 900, y: 430, w: 120, h: 90, type: 'grass' },
      { x: 1160, y: 470, w: 140, h: 50, type: 'grass' },
      { x: 1440, y: 520, w: 700, h: 90, type: 'grass' },
      { x: 1530, y: 395, w: 0, h: 0, label: "Morning shadows are long. Explore safely." },
      { x: 1700, y: 450, w: 120, h: 70, type: 'grass' },
      { x: 1960, y: 390, w: 150, h: 40, type: 'normal' },
      { x: 2280, y: 520, w: 500, h: 90, type: 'grass' },
      { x: 2420, y: 420, w: 90, h: 100, type: 'grass' },
      { x: 2660, y: 450, w: 130, h: 70, type: 'grass' },
      { x: 2920, y: 520, w: 650, h: 90, type: 'grass' },
      { x: 3020, y: 420, w: 150, h: 35, type: 'normal' },
      { x: 3260, y: 360, w: 150, h: 35, type: 'normal' },
      { x: 3480, y: 445, w: 100, h: 75, type: 'grass' },
      { x: 3720, y: 520, w: 440, h: 90, type: 'grass' },
      { x: 3860, y: 420, w: 110, h: 100, type: 'grass' },
      { x: 4150, y: 455, w: 160, h: 65, type: 'grass' },
      { x: 4420, y: 520, w: 460, h: 90, type: 'grass' },
      { x: 4520, y: 400, w: 160, h: 35, type: 'normal' },
      { x: 4750, y: 350, w: 130, h: 35, type: 'normal' },
      { x: 5050, y: 520, w: 1050, h: 90, type: 'grass' },
      { x: 5200, y: 420, w: 100, h: 100, type: 'grass' },
      { x: 5480, y: 445, w: 150, h: 75, type: 'grass' },
      { x: 5780, y: 500, w: 230, h: 20, type: 'normal' },
      { x: 5600, y: 385, w: 0, h: 0, label: "Reach the glowing archway. The longest day has only begun." }
    ],
    movingObjects: [],
    lightBeams: [],
    shadowNodes: [],
    orbs: [
      { id: "o1_1", x: 405, y: 380, collected: false, type: 'energy' },
      { id: "o1_2", x: 1230, y: 430, collected: false, type: 'energy' },
      { id: "o1_3", x: 2050, y: 340, collected: false, type: 'lore', loreText: "The meadow once celebrated the longest day. Now every year, the light grows sharper." },
      { id: "o1_4", x: 3360, y: 310, collected: false, type: 'energy' },
      { id: "o1_5", x: 4785, y: 300, collected: false, type: 'energy' },
      { id: "o1_6", x: 5540, y: 390, collected: false, type: 'energy' }
    ],
    checkpoints: [
      { id: "cp1_1", x: 850, y: 500, activated: false },
      { id: "cp1_2", x: 2200, y: 500, activated: false },
      { id: "cp1_3", x: 3650, y: 500, activated: false },
      { id: "cp1_4", x: 5050, y: 500, activated: false }
    ],
    pushableBlocks: []
  },

  {
    id: 2,
    name: "The Whispering Canopy",
    regionName: "Ancient Forest",
    description: "Dense trees and swaying branches create moving shadow routes. Dash is taught safely before precise timing is required.",
    width: 7000,
    height: 720,
    startX: 90,
    startY: 514,
    goalX: 6820,
    goalY: 500,
    sunAngle: 0.6,
    sunIntensity: 0.45,
    skyColors: ['#1d3557', '#457b9d', '#a8dadc'],
    ambientDarkness: 0.3,
    platforms: [
      { x: 0, y: 550, w: 760, h: 110, type: 'wood' },
      { x: 220, y: 360, w: 0, h: 0, label: "SHIFT = Shadow Dash. Use it to cross sunlit gaps." },
      { x: 330, y: 360, w: 95, h: 190, type: 'wood' },
      { x: 570, y: 455, w: 130, h: 35, type: 'wood' },
      { x: 850, y: 550, w: 620, h: 110, type: 'wood' },
      { x: 1010, y: 440, w: 160, h: 35, type: 'wood' },
      { x: 1260, y: 380, w: 150, h: 35, type: 'wood' },
      { x: 1580, y: 550, w: 740, h: 110, type: 'wood' },
      { x: 1700, y: 270, w: 110, h: 280, type: 'wood' },
      { x: 2070, y: 445, w: 160, h: 35, type: 'wood' },
      { x: 2420, y: 550, w: 620, h: 110, type: 'wood' },
      { x: 2570, y: 390, w: 160, h: 35, type: 'wood' },
      { x: 3180, y: 550, w: 480, h: 110, type: 'wood' },
      { x: 3300, y: 365, w: 110, h: 185, type: 'wood' },
      { x: 3600, y: 470, w: 160, h: 35, type: 'wood' },
      { x: 3850, y: 410, w: 160, h: 35, type: 'wood' },
      { x: 4120, y: 550, w: 650, h: 110, type: 'wood' },
      { x: 4240, y: 340, w: 130, h: 35, type: 'wood' },
      { x: 4500, y: 300, w: 150, h: 35, type: 'wood' },
      { x: 4930, y: 550, w: 620, h: 110, type: 'wood' },
      { x: 5060, y: 420, w: 120, h: 130, type: 'wood' },
      { x: 5350, y: 450, w: 160, h: 35, type: 'wood' },
      { x: 5650, y: 550, w: 540, h: 110, type: 'wood' },
      { x: 5770, y: 380, w: 170, h: 35, type: 'wood' },
      { x: 6040, y: 325, w: 130, h: 35, type: 'wood' },
      { x: 6330, y: 550, w: 670, h: 110, type: 'wood' },
      { x: 6460, y: 455, w: 160, h: 35, type: 'wood' },
      { x: 6700, y: 500, w: 240, h: 50, type: 'wood' }
    ],
    movingObjects: [
      { id: "m2_branch1", type: 'branch', startX: 730, startY: 260, w: 180, h: 22, speed: 0.018, rangeX: 55, rangeY: 0, phase: 0 },
      { id: "m2_branch2", type: 'branch', startX: 1450, startY: 305, w: 190, h: 22, speed: 0.016, rangeX: 0, rangeY: 45, phase: Math.PI / 2 },
      { id: "m2_branch3", type: 'branch', startX: 2340, startY: 275, w: 210, h: 22, speed: 0.02, rangeX: 70, rangeY: 15, phase: Math.PI },
      { id: "m2_branch4", type: 'branch', startX: 3780, startY: 300, w: 190, h: 22, speed: 0.022, rangeX: 80, rangeY: 0, phase: 1.4 },
      { id: "m2_branch5", type: 'branch', startX: 5200, startY: 280, w: 220, h: 22, speed: 0.018, rangeX: 0, rangeY: 55, phase: 2.1 },
      { id: "m2_branch6", type: 'branch', startX: 6160, startY: 260, w: 190, h: 22, speed: 0.024, rangeX: 90, rangeY: 18, phase: 0.4 }
    ],
    lightBeams: [],
    shadowNodes: [],
    orbs: [
      { id: "o2_1", x: 1080, y: 385, collected: false, type: 'energy' },
      { id: "o2_2", x: 1800, y: 220, collected: false, type: 'lore', loreText: "The canopy remembers when noon was gentle. Its leaves now move to keep the old paths alive." },
      { id: "o2_3", x: 2660, y: 340, collected: false, type: 'energy' },
      { id: "o2_4", x: 4550, y: 250, collected: false, type: 'energy' },
      { id: "o2_5", x: 5900, y: 320, collected: false, type: 'energy' },
      { id: "o2_6", x: 6510, y: 400, collected: false, type: 'energy' }
    ],
    checkpoints: [
      { id: "cp2_1", x: 880, y: 530, activated: false },
      { id: "cp2_2", x: 2400, y: 530, activated: false },
      { id: "cp2_3", x: 4100, y: 530, activated: false },
      { id: "cp2_4", x: 5600, y: 530, activated: false },
      { id: "cp2_5", x: 6350, y: 530, activated: false }
    ],
    pushableBlocks: []
  },

  {
    id: 3,
    name: "The Glimmering Chasm",
    regionName: "Crystal Cliffs",
    description: "Teleport nodes and crystal beams create a longer multi-step puzzle ascent through reflective cliffs.",
    width: 7300,
    height: 760,
    startX: 90,
    startY: 584,
    goalX: 7120,
    goalY: 520,
    sunAngle: 0.9,
    sunIntensity: 0.6,
    skyColors: ['#00b4d8', '#90e0ef', '#caf0f8'],
    ambientDarkness: 0.15,
    platforms: [
      { x: 0, y: 620, w: 600, h: 100, type: 'crystal' },
      { x: 180, y: 405, w: 0, h: 0, label: "Press E near a dark node to Shadow Teleport." },
      { x: 500, y: 655, w: 350, h: 50, type: 'danger' },
      { x: 900, y: 620, w: 620, h: 100, type: 'crystal' },
      { x: 1060, y: 500, w: 140, h: 35, type: 'crystal' },
      { x: 1320, y: 455, w: 140, h: 35, type: 'crystal' },
      { x: 1650, y: 620, w: 650, h: 100, type: 'crystal' },
      { x: 1810, y: 505, w: 340, h: 35, type: 'crystal' },
      { x: 1880, y: 395, w: 0, h: 0, label: "Push stone into sunlight to create temporary shade." },
      { x: 2360, y: 655, w: 420, h: 50, type: 'danger' },
      { x: 2840, y: 620, w: 590, h: 100, type: 'crystal' },
      { x: 2970, y: 500, w: 170, h: 35, type: 'crystal' },
      { x: 3560, y: 620, w: 600, h: 100, type: 'crystal' },
      { x: 3710, y: 465, w: 330, h: 35, type: 'crystal' },
      { x: 4240, y: 655, w: 480, h: 50, type: 'danger' },
      { x: 4760, y: 620, w: 600, h: 100, type: 'crystal' },
      { x: 4920, y: 480, w: 210, h: 35, type: 'crystal' },
      { x: 5190, y: 410, w: 160, h: 35, type: 'crystal' },
      { x: 5480, y: 620, w: 520, h: 100, type: 'crystal' },
      { x: 5630, y: 500, w: 150, h: 35, type: 'crystal' },
      { x: 5960, y: 655, w: 420, h: 50, type: 'danger' },
      { x: 6420, y: 620, w: 880, h: 100, type: 'crystal' },
      { x: 6550, y: 500, w: 150, h: 35, type: 'crystal' },
      { x: 6830, y: 520, w: 260, h: 35, type: 'crystal' }
    ],
    movingObjects: [],
    lightBeams: [
      { id: "beam3_1", x: 720, y: 0, w: 44, h: 655, active: true },
      { id: "beam3_2", x: 2050, y: 0, w: 60, h: 505, active: true, blockerId: "block3_1" },
      { id: "beam3_3", x: 3890, y: 0, w: 60, h: 465, active: true, blockerId: "block3_2" },
      { id: "beam3_4", x: 5050, y: 0, w: 70, h: 480, active: true, blockerId: "block3_3" },
      { id: "beam3_5", x: 6220, y: 0, w: 60, h: 655, active: true }
    ],
    shadowNodes: [
      { id: "node3_1", x: 460, y: 545, active: true },
      { id: "node3_2", x: 600, y: 515, active: true },
      { id: "node3_2b", x: 760, y: 535, active: true },
      { id: "node3_2c", x: 880, y: 550, active: true },
      { id: "node3_3", x: 980, y: 555, active: true },
      { id: "node3_4", x: 1140, y: 465, active: true },
      { id: "node3_5", x: 1310, y: 420, active: true },
      { id: "node3_6", x: 1780, y: 555, active: true },
      { id: "node3_7", x: 1970, y: 465, active: true },
      { id: "node3_7b", x: 2280, y: 560, active: true },
      { id: "node3_7c", x: 2440, y: 560, active: true },
      { id: "node3_7d", x: 2600, y: 560, active: true },
      { id: "node3_7e", x: 2760, y: 560, active: true },
      { id: "node3_8", x: 2930, y: 555, active: true },
      { id: "node3_9", x: 3090, y: 465, active: true },
      { id: "node3_10", x: 3690, y: 555, active: true },
      { id: "node3_11", x: 3860, y: 430, active: true },
      { id: "node3_11a", x: 4080, y: 520, active: true },
      { id: "node3_11b", x: 4240, y: 560, active: true },
      { id: "node3_11c", x: 4400, y: 560, active: true },
      { id: "node3_11d", x: 4560, y: 560, active: true },
      { id: "node3_11e", x: 4720, y: 560, active: true },
      { id: "node3_12", x: 4920, y: 555, active: true },
      { id: "node3_13", x: 5080, y: 445, active: true },
      { id: "node3_14", x: 5650, y: 555, active: true },
      { id: "node3_15", x: 5800, y: 465, active: true },
      { id: "node3_15b", x: 5960, y: 560, active: true },
      { id: "node3_15c", x: 6120, y: 560, active: true },
      { id: "node3_15d", x: 6280, y: 560, active: true },
      { id: "node3_16", x: 6480, y: 555, active: true },
      { id: "node3_17", x: 6660, y: 470, active: true },
      { id: "node3_18", x: 6920, y: 500, active: true }
    ],
    orbs: [
      { id: "o3_1", x: 1110, y: 455, collected: false, type: 'energy' },
      { id: "o3_2", x: 1980, y: 455, collected: false, type: 'lore', loreText: "The crystals do not hate the shadow. They only repeat the Sun until the world fractures." },
      { id: "o3_3", x: 3090, y: 450, collected: false, type: 'energy' },
      { id: "o3_4", x: 5080, y: 400, collected: false, type: 'energy' },
      { id: "o3_5", x: 6640, y: 430, collected: false, type: 'energy' }
    ],
    checkpoints: [
      { id: "cp3_1", x: 900, y: 600, activated: false },
      { id: "cp3_2", x: 2840, y: 600, activated: false },
      { id: "cp3_3", x: 4760, y: 600, activated: false },
      { id: "cp3_4", x: 6420, y: 600, activated: false }
    ],
    pushableBlocks: [
      { id: "block3_1", x: 1845, y: 425, w: 50, h: 80, vx: 0, vy: 0 },
      { id: "block3_2", x: 3725, y: 385, w: 50, h: 80, vx: 0, vy: 0 },
      { id: "block3_3", x: 4950, y: 400, w: 50, h: 80, vx: 0, vy: 0 }
    ]
  },

  {
    id: 4,
    name: "The Searing Expanse",
    regionName: "Solstice Desert",
    description: "A long noon crossing where cloud shadows, ruins, dashes, and teleport nodes provide precious routes through burning sand.",
    width: 7600,
    height: 650,
    startX: 90,
    startY: 484,
    goalX: 7420,
    goalY: 500,
    sunAngle: 1.25,
    sunIntensity: 0.8,
    skyColors: ['#f39c12', '#d35400', '#2c3e50'],
    ambientDarkness: 0.1,
    platforms: [
      { x: 0, y: 520, w: 620, h: 90, type: 'sand' },
      { x: 160, y: 360, w: 0, h: 0, label: "Ride moving cloud shadows. Shade is scarce at noon." },
      { x: 620, y: 550, w: 850, h: 50, type: 'danger' },
      { x: 760, y: 410, w: 120, h: 110, type: 'ruins' },
      { x: 920, y: 360, w: 120, h: 35, type: 'ruins' },
      { x: 1120, y: 430, w: 180, h: 35, type: 'ruins' },
      { x: 1320, y: 380, w: 140, h: 35, type: 'ruins' },
      { x: 1480, y: 520, w: 560, h: 90, type: 'sand' },
      { x: 1650, y: 350, w: 140, h: 170, type: 'ruins' },
      { x: 1820, y: 420, w: 130, h: 35, type: 'ruins' },
      { x: 1980, y: 550, w: 850, h: 50, type: 'danger' },
      { x: 2120, y: 430, w: 180, h: 35, type: 'ruins' },
      { x: 2320, y: 350, w: 150, h: 35, type: 'ruins' },
      { x: 2520, y: 380, w: 140, h: 140, type: 'ruins' },
      { x: 2700, y: 440, w: 130, h: 35, type: 'ruins' },
      { x: 2860, y: 520, w: 560, h: 90, type: 'sand' },
      { x: 3060, y: 405, w: 190, h: 35, type: 'ruins' },
      { x: 3280, y: 350, w: 150, h: 35, type: 'ruins' },
      { x: 3460, y: 550, w: 900, h: 50, type: 'danger' },
      { x: 3620, y: 360, w: 150, h: 160, type: 'ruins' },
      { x: 3800, y: 290, w: 140, h: 35, type: 'ruins' },
      { x: 3980, y: 430, w: 180, h: 35, type: 'ruins' },
      { x: 4180, y: 380, w: 150, h: 35, type: 'ruins' },
      { x: 4380, y: 520, w: 620, h: 90, type: 'sand' },
      { x: 4550, y: 350, w: 150, h: 170, type: 'ruins' },
      { x: 4750, y: 420, w: 160, h: 35, type: 'ruins' },
      { x: 4920, y: 360, w: 140, h: 35, type: 'ruins' },
      { x: 5050, y: 550, w: 900, h: 50, type: 'danger' },
      { x: 5200, y: 430, w: 180, h: 35, type: 'ruins' },
      { x: 5400, y: 340, w: 160, h: 35, type: 'ruins' },
      { x: 5600, y: 380, w: 150, h: 140, type: 'ruins' },
      { x: 5800, y: 440, w: 150, h: 35, type: 'ruins' },
      { x: 5980, y: 520, w: 660, h: 90, type: 'sand' },
      { x: 6170, y: 400, w: 190, h: 35, type: 'ruins' },
      { x: 6390, y: 340, w: 160, h: 35, type: 'ruins' },
      { x: 6680, y: 550, w: 520, h: 50, type: 'danger' },
      { x: 6840, y: 430, w: 180, h: 35, type: 'ruins' },
      { x: 7040, y: 380, w: 160, h: 35, type: 'ruins' },
      { x: 7240, y: 520, w: 360, h: 90, type: 'sand' }
    ],
    movingObjects: [
      { id: "cloud4_1", type: 'cloud', startX: 80, startY: 50, w: 260, h: 32, speed: 1.25, rangeX: 7200, rangeY: 0, phase: 0 },
      { id: "cloud4_2", type: 'cloud', startX: 780, startY: 65, w: 330, h: 36, speed: 1.05, rangeX: 6800, rangeY: 0, phase: Math.PI / 3 },
      { id: "cloud4_3", type: 'cloud', startX: 1600, startY: 45, w: 290, h: 30, speed: 1.45, rangeX: 6200, rangeY: 0, phase: Math.PI * 1.5 },
      { id: "cloud4_4", type: 'cloud', startX: 2600, startY: 72, w: 300, h: 34, speed: 1.18, rangeX: 5900, rangeY: 0, phase: 1.2 },
      { id: "cloud4_5", type: 'cloud', startX: 4200, startY: 58, w: 280, h: 32, speed: 1.35, rangeX: 5200, rangeY: 0, phase: 2.5 }
    ],
    lightBeams: [],
    shadowNodes: [
      { id: "node4_1", x: 790, y: 360, active: true },
      { id: "node4_1b", x: 980, y: 320, active: true },
      { id: "node4_2", x: 1160, y: 390, active: true },
      { id: "node4_2b", x: 1380, y: 340, active: true },
      { id: "node4_3", x: 1700, y: 300, active: true },
      { id: "node4_3b", x: 1950, y: 350, active: true },
      { id: "node4_4", x: 2200, y: 390, active: true },
      { id: "node4_4b", x: 2380, y: 310, active: true },
      { id: "node4_5", x: 2520, y: 330, active: true },
      { id: "node4_5b", x: 2750, y: 380, active: true },
      { id: "node4_6", x: 3660, y: 310, active: true },
      { id: "node4_6b", x: 3850, y: 250, active: true },
      { id: "node4_7", x: 4020, y: 390, active: true },
      { id: "node4_7b", x: 4250, y: 330, active: true },
      { id: "node4_8", x: 4600, y: 300, active: true },
      { id: "node4_8b", x: 4820, y: 350, active: true },
      { id: "node4_9", x: 5280, y: 390, active: true },
      { id: "node4_9b", x: 5480, y: 300, active: true },
      { id: "node4_10", x: 5640, y: 330, active: true },
      { id: "node4_10b", x: 5850, y: 380, active: true },
      { id: "node4_11", x: 6240, y: 360, active: true },
      { id: "node4_11b", x: 6480, y: 300, active: true },
      { id: "node4_12", x: 6920, y: 390, active: true },
      { id: "node4_12b", x: 7120, y: 340, active: true }
    ],
    orbs: [
      { id: "o4_1", x: 1150, y: 380, collected: false, type: 'energy' },
      { id: "o4_2", x: 2500, y: 330, collected: false, type: 'lore', loreText: "At noon, even the stone prays for a cloud." },
      { id: "o4_3", x: 3980, y: 380, collected: false, type: 'energy' },
      { id: "o4_4", x: 5280, y: 380, collected: false, type: 'energy' },
      { id: "o4_5", x: 6900, y: 380, collected: false, type: 'energy' }
    ],
    checkpoints: [
      { id: "cp4_1", x: 1480, y: 500, activated: false },
      { id: "cp4_2", x: 2860, y: 500, activated: false },
      { id: "cp4_3", x: 4380, y: 500, activated: false },
      { id: "cp4_4", x: 5980, y: 500, activated: false },
      { id: "cp4_5", x: 7240, y: 500, activated: false }
    ],
    pushableBlocks: []
  },

  {
    id: 5,
    name: "The Zenith Ascent",
    regionName: "Eclipse Summit",
    description: "An extended, multi-stage summit climb with scarce shadows, spinning bars, node chains, and a final earned traversal into the Eclipse Gate.",
    width: 5200,
    height: 1150,
    startX: 120,
    startY: 1054,
    goalX: 4950,
    goalY: 260,
    sunAngle: 1.52,
    sunIntensity: 1.0,
    skyColors: ['#ffffff', '#ffeb3b', '#ff9800'],
    ambientDarkness: 0.05,
    platforms: [
      { x: 0, y: 1090, w: 640, h: 60, type: 'ruins' },
      { x: 120, y: 980, w: 0, h: 0, label: "The final ascent. Shadows are fragments now." },
      { x: 650, y: 1110, w: 650, h: 40, type: 'danger' },
      { x: 360, y: 970, w: 180, h: 35, type: 'ruins' },
      { x: 580, y: 935, w: 160, h: 35, type: 'ruins' },
      { x: 780, y: 880, w: 180, h: 35, type: 'ruins' },
      { x: 1000, y: 820, w: 220, h: 35, type: 'ruins' },
      { x: 1260, y: 760, w: 260, h: 35, type: 'ruins' },
      { x: 1550, y: 930, w: 280, h: 35, type: 'ruins' },
      { x: 1750, y: 895, w: 180, h: 35, type: 'ruins' },
      { x: 1950, y: 850, w: 200, h: 35, type: 'ruins' },
      { x: 2180, y: 785, w: 220, h: 35, type: 'ruins' },
      { x: 2440, y: 720, w: 280, h: 35, type: 'ruins' },
      { x: 1780, y: 1035, w: 1150, h: 40, type: 'danger' },
      { x: 2840, y: 900, w: 320, h: 35, type: 'ruins' },
      { x: 3100, y: 860, w: 180, h: 35, type: 'ruins' },
      { x: 3300, y: 815, w: 200, h: 35, type: 'ruins' },
      { x: 3540, y: 730, w: 220, h: 35, type: 'ruins' },
      { x: 3780, y: 650, w: 280, h: 35, type: 'ruins' },
      { x: 4040, y: 570, w: 220, h: 35, type: 'ruins' },
      { x: 4280, y: 495, w: 240, h: 35, type: 'ruins' },
      { x: 4540, y: 420, w: 220, h: 35, type: 'ruins' },
      { x: 4740, y: 340, w: 200, h: 35, type: 'ruins' },
      { x: 4880, y: 300, w: 320, h: 30, type: 'ruins' },
      { x: 4550, y: 760, w: 640, h: 40, type: 'danger' }
    ],
    movingObjects: [
      { id: "spin5_1", type: 'spinning_bar', startX: 1540, startY: 780, w: 200, h: 22, speed: 0, rangeX: 0, rangeY: 0, rotationSpeed: 0.012, angle: 0 },
      { id: "spin5_2", type: 'spinning_bar', startX: 2260, startY: 625, w: 220, h: 22, speed: 0, rangeX: 0, rangeY: 0, rotationSpeed: -0.011, angle: Math.PI / 4 },
      { id: "spin5_3", type: 'spinning_bar', startX: 3780, startY: 525, w: 200, h: 22, speed: 0, rangeX: 0, rangeY: 0, rotationSpeed: 0.014, angle: 1.1 },
      { id: "spin5_4", type: 'spinning_bar', startX: 4680, startY: 255, w: 180, h: 20, speed: 0, rangeX: 0, rangeY: 0, rotationSpeed: -0.012, angle: 0.6 }
    ],
    lightBeams: [
      { id: "beam5_1", x: 1320, y: 0, w: 42, h: 760, active: true },
      { id: "beam5_2", x: 2680, y: 0, w: 44, h: 900, active: true },
      { id: "beam5_3", x: 4440, y: 0, w: 40, h: 420, active: true }
    ],
    shadowNodes: [
      { id: "node5_1", x: 430, y: 930, active: true },
      { id: "node5_1b", x: 540, y: 890, active: true },
      { id: "node5_2", x: 650, y: 865, active: true },
      { id: "node5_2b", x: 790, y: 820, active: true },
      { id: "node5_3", x: 940, y: 785, active: true },
      { id: "node5_3b", x: 1090, y: 750, active: true },
      { id: "node5_4", x: 1240, y: 720, active: true },
      { id: "node5_5", x: 1540, y: 890, active: true },
      { id: "node5_5b", x: 1720, y: 850, active: true },
      { id: "node5_6", x: 1900, y: 820, active: true },
      { id: "node5_6b", x: 2040, y: 780, active: true },
      { id: "node5_7", x: 2160, y: 745, active: true },
      { id: "node5_7b", x: 2300, y: 710, active: true },
      { id: "node5_8", x: 2440, y: 680, active: true },
      { id: "node5_9", x: 2910, y: 860, active: true },
      { id: "node5_9b", x: 3060, y: 810, active: true },
      { id: "node5_10", x: 3230, y: 775, active: true },
      { id: "node5_10b", x: 3380, y: 730, active: true },
      { id: "node5_11", x: 3500, y: 690, active: true },
      { id: "node5_11b", x: 3660, y: 650, active: true },
      { id: "node5_12", x: 3820, y: 610, active: true },
      { id: "node5_12b", x: 3940, y: 570, active: true },
      { id: "node5_13", x: 4060, y: 530, active: true },
      { id: "node5_13b", x: 4180, y: 490, active: true },
      { id: "node5_14", x: 4310, y: 455, active: true },
      { id: "node5_14b", x: 4430, y: 410, active: true },
      { id: "node5_15", x: 4560, y: 380, active: true },
      { id: "node5_15b", x: 4670, y: 340, active: true },
      { id: "node5_16", x: 4780, y: 305, active: true },
      { id: "node5_17", x: 4960, y: 260, active: true }
    ],
    orbs: [
      { id: "o5_1", x: 630, y: 835, collected: false, type: 'energy' },
      { id: "o5_2", x: 2160, y: 700, collected: false, type: 'lore', loreText: "At the peak, survival becomes memory. Every remaining shadow must be earned." },
      { id: "o5_3", x: 3500, y: 650, collected: false, type: 'energy' },
      { id: "o5_4", x: 4300, y: 420, collected: false, type: 'energy' },
      { id: "o5_5", x: 4780, y: 270, collected: false, type: 'energy' }
    ],
    checkpoints: [
      { id: "cp5_1", x: 1180, y: 740, activated: false },
      { id: "cp5_2", x: 2840, y: 880, activated: false },
      { id: "cp5_3", x: 3690, y: 630, activated: false },
      { id: "cp5_4", x: 4480, y: 400, activated: false }
    ],
    pushableBlocks: []
  }
];