/* ================================================================
   Star Fury — Procedural Audio Engine (Web Audio API)
   ================================================================ */

const Audio = (() => {
  let ctx = null;
  let muted = false;
  let masterGain = null;

  /* --- Drone / ambient state --- */
  let droneNodes = null;
  let droneGen = 0;
  let sparkleInterval = null;

  const SPARKLE_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      muted = localStorage.getItem('starFuryMuted') === 'true';
      masterGain.gain.value = muted ? 0 : 1;
    } catch (e) { /* Web Audio not available */ }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function toggle() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.15);
    }
    try { localStorage.setItem('starFuryMuted', String(muted)); } catch (e) { /* */ }
    return muted;
  }

  function isMuted() { return muted; }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function haptic(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* */ }
  }

  function playTone(freq, duration, type, volume, detune) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(volume || 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playFilteredTone(freq, duration, type, volume, filterFreq, filterQ) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 2000;
    filter.Q.value = filterQ || 1;
    gain.gain.setValueAtTime(volume || 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, volume, filterFreq) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
  }

  /* ------------------------------------------------------------------ */
  /*  Sound effects                                                      */
  /* ------------------------------------------------------------------ */

  /** Short laser "pew" — high-freq square + noise burst */
  function shoot() {
    if (!ctx) return;
    playTone(1200, 0.06, 'square', 0.06);
    playTone(800, 0.04, 'square', 0.04);
    playNoise(0.04, 0.03, 3000);
  }

  /** Metallic clang when bullet damages but doesn't kill */
  function enemyHit() {
    if (!ctx) return;
    playTone(800, 0.1, 'triangle', 0.08);
    playNoise(0.06, 0.04, 1500);
  }

  /** Noise burst + descending sawtooth sweep */
  function enemyExplode() {
    if (!ctx) return;
    playNoise(0.25, 0.12, 800);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
    haptic([20, 10, 30]);
  }

  /** Larger, deeper explosion for bosses */
  function bossExplode() {
    if (!ctx) return;
    playNoise(0.5, 0.2, 500);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.55);
    playFilteredTone(60, 0.6, 'sawtooth', 0.1, 200, 3);
    haptic([40, 20, 60]);
  }

  /** Impact + warning tone — low noise + dissonant chord */
  function playerHit() {
    if (!ctx) return;
    playNoise(0.3, 0.15, 400);
    playTone(180, 0.3, 'sawtooth', 0.08);
    playTone(190, 0.3, 'sawtooth', 0.06);
    haptic([30, 10, 50]);
  }

  /** Crystalline shatter — high-freq noise + descending sine */
  function shieldBreak() {
    if (!ctx) return;
    playNoise(0.2, 0.1, 4000);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
    haptic([15, 10, 25]);
  }

  /** Ascending 3-note chime (crystal pickup) */
  function powerup() {
    if (!ctx) return;
    playTone(880, 0.08, 'sine', 0.10);
    setTimeout(() => playTone(1100, 0.10, 'sine', 0.08), 40);
    setTimeout(() => playTone(1320, 0.08, 'sine', 0.06), 80);
    haptic(10);
  }

  /** Deep boom — very low sawtooth sweep + heavy noise + haptic */
  function bomb() {
    if (!ctx) return;
    playNoise(0.6, 0.25, 300);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.65);
    haptic([60, 30, 100]);
  }

  /** 4-note ascending fanfare */
  function waveClear() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
    haptic([15, 20, 15, 20, 30]);
  }

  /** Ominous low pulse — slow sawtooth with LFO */
  function bossWarn() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 1.25);
    /* LFO for wobble */
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + 1.25);
    haptic([40, 20, 40, 20, 40]);
  }

  /** Quick ascending ping — pitch scales with combo count */
  function comboUp(combo) {
    if (!ctx) return;
    const base = 600 + Math.min(combo || 1, 15) * 60;
    playTone(base, 0.08, 'sine', 0.07);
    playTone(base * 1.5, 0.06, 'sine', 0.04);
  }

  /** Descending doom sweep (500→60Hz) */
  function gameOver() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 1.0);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 2;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 1.1);
    playNoise(0.5, 0.08, 400);
    haptic([50, 30, 80]);
  }

  /** Celebratory 3-note golden chime */
  function achievement() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
      /* Shimmer octave */
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.04, now + i * 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + i * 0.1);
      osc2.stop(now + i * 0.1 + 0.4);
    });
    haptic([10, 15, 10, 15, 20]);
  }

  /** 6-note ascending fanfare for new high score */
  function newHighScore() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1568.0];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.03, now + i * 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + i * 0.1);
      osc2.stop(now + i * 0.1 + 0.4);
    });
    haptic([15, 30, 15, 30, 15, 30, 40]);
  }

  /* ------------------------------------------------------------------ */
  /*  Deep space ambient drone                                           */
  /* ------------------------------------------------------------------ */

  function startDrone() {
    if (!ctx) return;
    stopDrone();
    const gen = ++droneGen;
    const now = ctx.currentTime;

    /* Low sine pad */
    const pad1 = ctx.createOscillator();
    pad1.type = 'sine';
    pad1.frequency.value = 55;
    const pad1Filter = ctx.createBiquadFilter();
    pad1Filter.type = 'lowpass';
    pad1Filter.frequency.value = 120;
    pad1Filter.Q.value = 1;
    const pad1Gain = ctx.createGain();
    pad1Gain.gain.setValueAtTime(0.001, now);
    pad1Gain.gain.linearRampToValueAtTime(0.035, now + 3);
    pad1.connect(pad1Filter);
    pad1Filter.connect(pad1Gain);
    pad1Gain.connect(masterGain);
    pad1.start(now);

    /* Second pad — slight detune */
    const pad2 = ctx.createOscillator();
    pad2.type = 'triangle';
    pad2.frequency.value = 82.41;
    pad2.detune.value = 5;
    const pad2Gain = ctx.createGain();
    pad2Gain.gain.setValueAtTime(0.001, now);
    pad2Gain.gain.linearRampToValueAtTime(0.02, now + 4);
    pad2.connect(pad2Gain);
    pad2Gain.connect(masterGain);
    pad2.start(now);

    /* LFO for filter sweep */
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(pad1Filter.frequency);
    lfo.start(now);

    /* Filtered noise layer */
    const windDuration = 8;
    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * windDuration, ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < windData.length; i++) {
      windData[i] = (Math.random() * 2 - 1);
    }
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = windBuffer;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 300;
    windFilter.Q.value = 0.4;
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.001, now);
    windGain.gain.linearRampToValueAtTime(0.015, now + 3);
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSrc.start(now);

    droneNodes = {
      gen,
      pads: [pad1, pad2],
      gains: [pad1Gain, pad2Gain],
      filters: [pad1Filter],
      lfo,
      lfoGain,
      wind: windSrc,
      windGain,
      windFilter,
    };

    /* Pentatonic sparkles */
    sparkleInterval = setInterval(() => {
      if (droneGen !== gen || !ctx) return;
      const freq = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];
      const vol = 0.012 + Math.random() * 0.02;
      const dur = 0.3 + Math.random() * 0.5;
      playTone(freq, dur, 'sine', vol);
      if (Math.random() < 0.25) {
        playTone(freq * 2, dur * 0.7, 'sine', vol * 0.4);
      }
    }, 800 + Math.random() * 700);
  }

  function stopDrone() {
    if (sparkleInterval) {
      clearInterval(sparkleInterval);
      sparkleInterval = null;
    }
    if (!droneNodes || !ctx) return;
    const gen = droneNodes.gen;
    const fadeTime = 1.5;
    const now = ctx.currentTime;

    droneNodes.gains.forEach((g) => {
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.001, now + fadeTime);
    });
    droneNodes.windGain.gain.setValueAtTime(droneNodes.windGain.gain.value, now);
    droneNodes.windGain.gain.linearRampToValueAtTime(0.001, now + fadeTime);

    const nodes = droneNodes;
    droneNodes = null;
    setTimeout(() => {
      if (droneGen !== gen) return;
      try {
        nodes.pads.forEach((p) => p.stop());
        nodes.lfo.stop();
        nodes.wind.stop();
      } catch (_) { /* already stopped */ }
    }, (fadeTime + 0.2) * 1000);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */
  return {
    init, resume, toggle, isMuted,
    shoot, enemyHit, enemyExplode, bossExplode,
    playerHit, shieldBreak, powerup, bomb,
    waveClear, bossWarn, comboUp,
    gameOver, achievement, newHighScore,
    startDrone, stopDrone,
  };
})();
