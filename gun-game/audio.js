/**
 * Procedural audio engine for Gun Game.
 * Uses the Web Audio API — no external sound files needed.
 */
const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;

  /* --- Drone / ambient state --- */
  let droneNodes = null;
  let droneGen = 0;

  /* --- Sparkle arpeggio state --- */
  let sparkleInterval = null;

  /* Pentatonic scale frequencies for the magical arpeggios (C5 pentatonic) */
  const SPARKLE_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    const saved = localStorage.getItem("gunGameMuted");
    muted = saved === "true";
    masterGain.gain.value = muted ? 0 : 1;
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function toggle() {
    muted = !muted;
    localStorage.setItem("gunGameMuted", String(muted));
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.15);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function playTone(freq, duration, type, volume, detune) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
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
    osc.type = type || "sine";
    osc.frequency.value = freq;
    filter.type = "lowpass";
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
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
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

  /** Soft airy whoosh + subtle bell chime when flapping */
  function flap() {
    if (!ctx) return;
    playNoise(0.12, 0.06, 3000);
    playTone(1100, 0.1, "sine", 0.04);
    playTone(1650, 0.08, "sine", 0.02);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  /** Magical ascending bell chime when scoring */
  function score() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.35);
    });
    playTone(1760, 0.4, "sine", 0.03);
    if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
  }

  /** Muffled impact + dissonant tone on crash */
  function crash() {
    if (!ctx) return;
    playNoise(0.35, 0.18, 600);
    playFilteredTone(110, 0.5, "sawtooth", 0.12, 400, 3);
    playTone(220, 0.3, "triangle", 0.06);
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
  }

  /** Celebratory ascending fanfare for new high score */
  function newHighScore() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1568.0];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.03, now + i * 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + i * 0.1);
      osc2.stop(now + i * 0.1 + 0.4);
    });
    if (navigator.vibrate) navigator.vibrate([15, 30, 15, 30, 15, 30, 40]);
  }

  /* ------------------------------------------------------------------ */
  /*  Magical ambient drone                                              */
  /* ------------------------------------------------------------------ */

  function startDrone() {
    if (!ctx) return;
    stopDrone();
    const gen = ++droneGen;
    const now = ctx.currentTime;

    const pad1 = ctx.createOscillator();
    pad1.type = "sine";
    pad1.frequency.value = 174.61;
    const pad1Gain = ctx.createGain();
    pad1Gain.gain.setValueAtTime(0.001, now);
    pad1Gain.gain.linearRampToValueAtTime(0.045, now + 3);
    const pad1Filter = ctx.createBiquadFilter();
    pad1Filter.type = "lowpass";
    pad1Filter.frequency.value = 800;
    pad1Filter.Q.value = 1;
    pad1.connect(pad1Filter);
    pad1Filter.connect(pad1Gain);
    pad1Gain.connect(masterGain);
    pad1.start(now);

    const pad2 = ctx.createOscillator();
    pad2.type = "triangle";
    pad2.frequency.value = 261.63;
    pad2.detune.value = 7;
    const pad2Gain = ctx.createGain();
    pad2Gain.gain.setValueAtTime(0.001, now);
    pad2Gain.gain.linearRampToValueAtTime(0.03, now + 4);
    const pad2Filter = ctx.createBiquadFilter();
    pad2Filter.type = "lowpass";
    pad2Filter.frequency.value = 1200;
    pad2Filter.Q.value = 0.7;
    pad2.connect(pad2Filter);
    pad2Filter.connect(pad2Gain);
    pad2Gain.connect(masterGain);
    pad2.start(now);

    const pad3 = ctx.createOscillator();
    pad3.type = "sine";
    pad3.frequency.value = 392.0;
    pad3.detune.value = -5;
    const pad3Gain = ctx.createGain();
    pad3Gain.gain.setValueAtTime(0.001, now);
    pad3Gain.gain.linearRampToValueAtTime(0.018, now + 5);
    pad3.connect(pad3Gain);
    pad3Gain.connect(masterGain);
    pad3.start(now);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain);
    lfoGain.connect(pad1Filter.frequency);
    lfoGain.connect(pad2Filter.frequency);
    lfo.start(now);

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
    windFilter.type = "bandpass";
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.001, now);
    windGain.gain.linearRampToValueAtTime(0.018, now + 3);
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSrc.start(now);

    droneNodes = {
      gen,
      pads: [pad1, pad2, pad3],
      gains: [pad1Gain, pad2Gain, pad3Gain],
      filters: [pad1Filter, pad2Filter],
      lfo,
      lfoGain,
      wind: windSrc,
      windGain,
      windFilter,
    };

    sparkleInterval = setInterval(() => {
      if (droneGen !== gen || !ctx) return;
      const freq = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];
      const vol = 0.015 + Math.random() * 0.025;
      const dur = 0.3 + Math.random() * 0.5;
      playTone(freq, dur, "sine", vol);
      if (Math.random() < 0.3) {
        playTone(freq * 2, dur * 0.7, "sine", vol * 0.4);
      }
    }, 700 + Math.random() * 600);
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
  /*  Gun Game sound effects                                              */
  /* ------------------------------------------------------------------ */

  /** Short percussive pop, pitch varies by tier */
  function gunShoot(tier) {
    if (!ctx) return;
    const baseFreq = 200 + tier * 80;
    playTone(baseFreq, 0.08, "square", 0.06);
    playNoise(0.06, 0.04, 2000 + tier * 300);
    if (tier >= 5) playTone(baseFreq * 1.5, 0.06, "sawtooth", 0.03);
    if (tier >= 7) playTone(baseFreq * 2, 0.04, "sine", 0.04);
  }

  /** Metallic clang on pipe hit */
  function gunPipeHit() {
    if (!ctx) return;
    playTone(800, 0.12, "triangle", 0.08);
    playNoise(0.08, 0.05, 1500);
    playFilteredTone(400, 0.15, "square", 0.04, 800, 4);
  }

  /** Noise burst + descending tone on pipe destroy */
  function gunPipeDestroy() {
    if (!ctx) return;
    playNoise(0.3, 0.12, 800);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
    if (navigator.vibrate) navigator.vibrate([20, 10, 30]);
  }

  /** Ascending 4-note fanfare for tier up */
  function gunTierUp() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
    if (navigator.vibrate) navigator.vibrate([15, 20, 15, 20, 30]);
  }

  /** Descending 2-note minor interval for tier down */
  function gunTierDown() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 311.13];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
    if (navigator.vibrate) navigator.vibrate([30, 10, 50]);
  }

  /** Extended 8-note ascending fanfare for victory */
  function gunVictory() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.6);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.03, now + i * 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + i * 0.12);
      osc2.stop(now + i * 0.12 + 0.5);
    });
    if (navigator.vibrate) navigator.vibrate([15, 20, 15, 20, 15, 20, 15, 20, 40]);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */
  return {
    init,
    resume,
    toggle,
    isMuted,
    flap,
    score,
    crash,
    newHighScore,
    startDrone,
    stopDrone,
    gunShoot,
    gunPipeHit,
    gunPipeDestroy,
    gunTierUp,
    gunTierDown,
    gunVictory,
  };
})();
