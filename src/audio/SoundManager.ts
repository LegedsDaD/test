// SoundManager.ts - Procedural Audio Generator using Web Audio API
// Created for "LONGEST DAY, SHORTEST SHADOW"

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Music nodes
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padGain: GainNode | null = null;
  private subBass: OscillatorNode | null = null;
  private pianoInterval: any = null;
  
  // SFX nodes
  private sizzleGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceLfo: OscillatorNode | null = null;
  
  private isMuted: boolean = false;
  private volume: number = 0.6;
  private isMusicPlaying: boolean = false;
  private intensity: number = 0.0; // 0.0 (peaceful morning) to 1.0 (tense noon/summit)
  private currentRegion: number = -1; // -1 = no region, 0..4 = 5 regions

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private init() {
    if (this.ctx) return;
    
    // Support standard and webkit audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
      
      // Create master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Create separate gains for music and sfx
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.6;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      // Create a separate gain for ambient field recordings (wind, leaves, chimes)
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = 0.0;
      this.ambienceGain.connect(this.masterGain);

      // Initialize continuous sizzle sound (for sunlight burning)
      this.initSizzle();
    } catch (e) {
      console.error("Failed to initialize Web Audio API:", e);
    }
  }

  private initSizzle() {
    if (!this.ctx || !this.sfxGain) return;

    // Create a sizzling noise node
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white/pinkish noise
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter it slightly to make it pinker/softer (sizzle)
      data[i] = 0.8 * lastOut + 0.2 * white;
      lastOut = data[i];
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    // Filter to make it sound like sizzling/burning shadow
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    filter.Q.value = 1.0;

    this.sizzleGain = this.ctx.createGain();
    this.sizzleGain.gain.value = 0; // Start silent

    noiseNode.connect(filter);
    filter.connect(this.sizzleGain);
    this.sizzleGain.connect(this.sfxGain);
    
    noiseNode.start(0);
  }

  public resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public startMusic() {
    this.resumeContext();
    if (this.isMusicPlaying || !this.ctx || !this.musicGain) return;
    this.isMusicPlaying = true;

    this.startRegionAmbience(0);

    // Create low ambient pad
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.15;
    this.padGain.connect(this.musicGain);

    // Osc 1: Low Drone (Root note C2 = 65.41Hz, or Eb2 = 73.42Hz)
    this.padOsc1 = this.ctx.createOscillator();
    this.padOsc1.type = 'triangle';
    this.padOsc1.frequency.value = 73.42; // Eb2
    
    // Osc 2: Fifth (Bb2 = 116.54Hz) or Octave
    this.padOsc2 = this.ctx.createOscillator();
    this.padOsc2.type = 'sine';
    this.padOsc2.frequency.value = 110.00; // A2/Bb2 approximate or major third

    // Add lowpass filter to make it warm and soft
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;

    this.padOsc1.connect(lowpass);
    this.padOsc2.connect(lowpass);
    lowpass.connect(this.padGain);

    this.padOsc1.start(0);
    this.padOsc2.start(0);

    // Start emotional piano arpeggios/notes
    this.startPianoLoop();
  }

  private startPianoLoop() {
    if (this.pianoInterval) clearInterval(this.pianoInterval);

    // Eb Major pentatonic scale: Eb, F, G, Bb, C
    const scale = [155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16];
    
    const playPianoNote = () => {
      if (!this.ctx || !this.musicGain || !this.isMusicPlaying) return;

      // Decide if we play a note (sometimes rest)
      if (Math.random() > 0.7 && this.intensity < 0.5) return;

      const pitch = scale[Math.floor(Math.random() * scale.length)];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = this.ctx.createDelay();
      const feedback = this.ctx.createGain();

      osc.type = 'sine';
      // If intensity is high, raise pitch slightly or make it more tense
      const finalPitch = this.intensity > 0.7 ? pitch * 1.5 : pitch;
      osc.frequency.value = finalPitch;

      // Piano-like envelope
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2 + this.intensity * 0.1, this.ctx.currentTime + 0.05); // attack
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5 - this.intensity * 1.0); // decay

      // Simple delay/echo effect
      delay.delayTime.value = 0.4;
      feedback.gain.value = 0.4;

      osc.connect(gain);
      gain.connect(this.musicGain);

      // Connect delay
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.musicGain);

      osc.start(0);
      osc.stop(this.ctx.currentTime + 3.0);
    };

    // Piano notes play every 1.5s to 3s based on intensity
    const runLoop = () => {
      if (!this.isMusicPlaying) return;
      playPianoNote();
      const nextTime = (1500 + Math.random() * 2000) / (1.0 + this.intensity * 1.5);
      this.pianoInterval = setTimeout(runLoop, nextTime);
    };

    runLoop();
  }

  public setMusicIntensity(intensity: number) {
    this.intensity = Math.max(0, Math.min(1, intensity));
    if (!this.ctx || !this.padOsc1 || !this.padOsc2 || !this.padGain) return;

    // Modify pad frequencies and volumes based on intensity
    // As intensity increases (shadows shrink), make the drone slightly higher/tenser
    const baseFreq = 73.42; // Eb2
    this.padOsc1.frequency.setTargetAtTime(baseFreq * (1.0 + this.intensity * 0.08), this.ctx.currentTime, 1.0);
    this.padOsc2.frequency.setTargetAtTime(110.00 * (1.0 + this.intensity * 0.12), this.ctx.currentTime, 1.0);
    
    // Make the pad louder and add warmth with increased intensity
    this.padGain.gain.setTargetAtTime(0.18 + this.intensity * 0.15, this.ctx.currentTime, 1.0);
    
    // Add atmospheric sub-bass throbbing when intensity rises (>0.4)
    if (this.intensity > 0.4 && !this.subBass && this.musicGain) {
      this.subBass = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      this.subBass.type = 'sine';
      this.subBass.frequency.value = 36.7; // Deep sub Eb
      subGain.gain.value = (this.intensity - 0.4) * 0.18;
      this.subBass.connect(subGain);
      subGain.connect(this.musicGain);
      this.subBass.start(0);
    } else if (this.subBass) {
      if (this.intensity <= 0.35) {
        try { this.subBass.stop(); } catch(e) {}
        this.subBass = null;
      }
    }
  }

  public playJump() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    // Layered jump: soft body pop + airy whoosh + low thump
    const now = this.ctx.currentTime;

    // Body pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.28);

    // Soft airy whoosh (filtered noise)
    const bufSize = this.ctx.sampleRate * 0.2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(600, now);
    filt.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
    filt.Q.value = 4.0;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0, now);
    ng.gain.linearRampToValueAtTime(0.10, now + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filt); filt.connect(ng); ng.connect(this.sfxGain);
    noise.start(now); noise.stop(now + 0.25);

    // Deep body thump
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(85, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.18);
    subG.gain.setValueAtTime(0.001, now);
    subG.gain.linearRampToValueAtTime(0.18, now + 0.04);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    sub.connect(subG); subG.connect(this.sfxGain);
    sub.start(now); sub.stop(now + 0.3);
  }

  public playLand() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Soft impact thud with dust crunch
    const thud = this.ctx.createOscillator();
    const thudG = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, now);
    thud.frequency.exponentialRampToValueAtTime(45, now + 0.15);
    thudG.gain.setValueAtTime(0.001, now);
    thudG.gain.linearRampToValueAtTime(0.28, now + 0.01);
    thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thud.connect(thudG); thudG.connect(this.sfxGain);
    thud.start(now); thud.stop(now + 0.25);

    // Dust noise crackle
    const bufSize = this.ctx.sampleRate * 0.18;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 2000;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0, now);
    ng.gain.linearRampToValueAtTime(0.08, now + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filt); filt.connect(ng); ng.connect(this.sfxGain);
    noise.start(now); noise.stop(now + 0.2);
  }

  public playDash() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Powerful sweeping noise
    const bufferSize = this.ctx.sampleRate * 0.35; // 0.35 sec
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(4500, now + 0.25);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.48, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);

    // Deep whoosh underneath
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(80, now);
    sub.frequency.exponentialRampToValueAtTime(180, now + 0.2);
    subG.gain.setValueAtTime(0.0, now);
    subG.gain.linearRampToValueAtTime(0.18, now + 0.05);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    sub.connect(subG); subG.connect(this.sfxGain);
    sub.start(now); sub.stop(now + 0.35);
  }

  public playTeleport() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    // A beautiful, mystical crystal chime sound with two stages:
    // 1. A sparkling ascending arpeggio
    // 2. A soft reassembly sparkle when arriving
    const now = this.ctx.currentTime;
    
    // Crystalline upward arpeggio (A major with high shimmer)
    const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 880.00, 1108.73];
    frequencies.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      // Slight pitch bend for sparkle
      osc.frequency.exponentialRampToValueAtTime(freq * 1.1, now + 0.05 + idx * 0.04);

      gain.gain.setValueAtTime(0, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.04 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.5);
    });

    // Reverse swish (filtered noise sweeping from low to high)
    const bufSize = this.ctx.sampleRate * 0.4;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(400, now);
    filt.frequency.exponentialRampToValueAtTime(6000, now + 0.35);
    filt.Q.value = 4.0;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0, now);
    ng.gain.linearRampToValueAtTime(0.10, now + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    noise.connect(filt); filt.connect(ng); ng.connect(this.sfxGain);
    noise.start(now);
  }

  public playCollect() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // A quick ascending bright arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.3);
    });
  }

  public playCheckpoint() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Slow, warm, rich resonant sound
    const notes = [196.00, 293.66, 392.00, 493.88]; // G major open
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + idx * 0.15);

      // Lowpass filter for warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 1.5);
    });
  }

  public playBurn(active: boolean) {
    this.resumeContext();
    if (!this.sizzleGain || this.isMuted) return;
    
    // Smoothly transition the sizzling volume
    const targetVolume = active ? 0.35 : 0.0;
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.sizzleGain.gain.setTargetAtTime(targetVolume, now, 0.1);
  }

  public playVictory() {
    this.resumeContext();
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    // Stop normal music
    this.stopMusic();

    const now = this.ctx.currentTime;
    
    // Play a glorious celestial swell (major chord building up)
    const root = 130.81; // C3
    const chord = [root, root * 1.25, root * 1.5, root * 2, root * 2.5, root * 3]; // C, E, G, C, E, G
    
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + 3);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.15 + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0 + idx * 0.3);

      // Beautiful delay
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.5;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.5;

      osc.connect(gain);
      gain.connect(this.musicGain);
      
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.musicGain);

      osc.start(now + idx * 0.15);
      osc.stop(now + 6.0);
    });

    // Procedural bird chirps! To signal the return of life
    setTimeout(() => {
      this.playBirdChirp();
      setTimeout(() => this.playBirdChirp(), 400);
      setTimeout(() => this.playBirdChirp(), 1200);
      setTimeout(() => this.playBirdChirp(), 1500);
    }, 3000);
  }

  private playBirdChirp() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Rapid pitch sweeps
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(4500, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(2500, now + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public stopMusic() {
    if (this.pianoInterval) {
      clearInterval(this.pianoInterval);
      this.pianoInterval = null;
    }
    this.isMusicPlaying = false;
    
    if (this.padOsc1) {
      try { this.padOsc1.stop(); } catch(e) {}
      this.padOsc1 = null;
    }
    if (this.padOsc2) {
      try { this.padOsc2.stop(); } catch(e) {}
      this.padOsc2 = null;
    }
    if (this.padGain) {
      this.padGain = null;
    }
    
    // Stop region ambience gracefully
    this.stopRegionAmbience();
  }

  // ----- Region Ambience System -----
  // Each region has a unique synthesized ambient bed. 
  // 0 = Whispering Meadow, 1 = Ancient Forest, 2 = Crystal Cliffs,
  // 3 = Solstice Desert, 4 = Eclipse Summit.
  public startRegionAmbience(regionIndex: number) {
    this.resumeContext();
    if (!this.ctx || !this.ambienceGain || this.isMuted) return;
    if (this.currentRegion === regionIndex) return;
    
    this.stopRegionAmbience();
    this.currentRegion = regionIndex;

    const region = regionIndex;
    // Each region has a distinct base noise color and a unique slow LFO pulse to make the
    // ambient sound feel like wind, leaves, crystals, sand, or deep cathedral-like space.
    let filterFreq = 600;
    let lfoFreq = 0.18;
    let lfoDepth = 220;
    let volume = 0.15;

    if (region === 0) { // Whispering Meadow: soft morning wind & birds
      filterFreq = 500; lfoFreq = 0.22; lfoDepth = 180; volume = 0.16;
    } else if (region === 1) { // Ancient Forest: deeper wind & leaves
      filterFreq = 350; lfoFreq = 0.16; lfoDepth = 280; volume = 0.18;
    } else if (region === 2) { // Crystal Cliffs: high resonance
      filterFreq = 1200; lfoFreq = 0.32; lfoDepth = 350; volume = 0.16;
    } else if (region === 3) { // Solstice Desert: dry howling wind
      filterFreq = 700; lfoFreq = 0.14; lfoDepth = 480; volume = 0.20;
    } else if (region === 4) { // Eclipse Summit: deep silence/space
      filterFreq = 220; lfoFreq = 0.09; lfoDepth = 120; volume = 0.22;
    }

    // Generate a long noise buffer
    const bufferSize = this.ctx.sampleRate * 4; // 4 seconds of loopable noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // For region 0 (meadow) we mix a brighter pink noise, for region 4 (summit) it's deeper.
      const pinkAmount = region === 4 ? 0.95 : 0.7;
      lastOut = pinkAmount * lastOut + (1 - pinkAmount) * white;
      data[i] = lastOut;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoFreq;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(this.ambienceGain);
    
    source.start(0);
    lfo.start(0);

    this.ambienceSource = source;
    this.ambienceFilter = filter;
    this.ambienceLfo = lfo;

    this.ambienceGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.ambienceGain.gain.setValueAtTime(this.ambienceGain.gain.value, this.ctx.currentTime);
    this.ambienceGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 1.5);
  }

  public stopRegionAmbience() {
    if (this.ctx && this.ambienceGain) {
      this.ambienceGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.ambienceGain.gain.setValueAtTime(this.ambienceGain.gain.value, this.ctx.currentTime);
      this.ambienceGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.5);
    }
    if (this.ambienceLfo) {
      try { this.ambienceLfo.stop(); } catch(e) {}
      this.ambienceLfo = null;
    }
    if (this.ambienceSource) {
      // Disconnect after fade-out
      const src = this.ambienceSource;
      const filt = this.ambienceFilter;
      setTimeout(() => {
        try { src.stop(); } catch(e) {}
        src.disconnect();
        if (filt) filt.disconnect();
      }, 600);
      this.ambienceSource = null;
      this.ambienceFilter = null;
    }
    this.currentRegion = -1;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

// Export a singleton instance
export const audio = new SoundManager();
