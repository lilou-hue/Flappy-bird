/* ================================================================
   Astro Miner — Procedural Audio Engine (Web Audio API)
   ================================================================ */

const Audio = (() => {
  let ctx = null;
  let muted = false;
  let masterGain = null;
  let droneOsc = null;
  let droneGain = null;
  let droneStopId = 0;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      muted = localStorage.getItem('astroMinerMuted') === 'true';
      masterGain.gain.value = muted ? 0 : 1;
    } catch (e) { /* Web Audio not available */ }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function toggle() {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    try { localStorage.setItem('astroMinerMuted', String(muted)); } catch (e) { /* */ }
    return muted;
  }

  function isMuted() { return muted; }

  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* haptic not available */ }
  }

  function playTone(freq, duration, type, volume) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  function playNoise(duration, volume, filterFreq) {
    if (!ctx || muted) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 400;
    source.connect(filter);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
  }

  /* --- Sound Effects --- */

  function jump() {
    playTone(420, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(560, 0.06, 'sine', 0.08), 25);
    haptic(12);
  }

  function jetpack() {
    if (!ctx || muted) return;
    playNoise(0.08, 0.06, 600);
    playTone(120, 0.08, 'sawtooth', 0.04);
  }

  function crystal() {
    playTone(880, 0.08, 'sine', 0.10);
    setTimeout(() => playTone(1100, 0.10, 'sine', 0.08), 40);
    setTimeout(() => playTone(1320, 0.08, 'sine', 0.06), 80);
    haptic(10);
  }

  function crash() {
    playNoise(0.4, 0.25, 300);
    playTone(70, 0.5, 'sawtooth', 0.12);
    haptic([40, 30, 80]);
  }

  function laserBuzz() {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 180;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  function blackHoleRumble() {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 40;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 80;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.10, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    /* LFO wobble */
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 4;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
    lfo.stop(ctx.currentTime + 0.65);
  }

  function gravityShift() {
    if (!ctx || muted) return;
    playTone(260, 0.2, 'triangle', 0.08);
    setTimeout(() => playTone(390, 0.18, 'triangle', 0.06), 80);
    haptic([15, 10, 15]);
  }

  function newHighScore() {
    if (!ctx || muted) return;
    playTone(523, 0.15, 'sine', 0.10);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.10), 120);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.10), 240);
    setTimeout(() => playTone(1047, 0.25, 'sine', 0.12), 360);
    haptic([20, 15, 20, 15, 40]);
  }

  function land() {
    playNoise(0.06, 0.08, 500);
    haptic(8);
  }

  /* --- Ambient Space Drone --- */

  function startDrone() {
    if (!ctx) return;
    droneStopId++;
    try {
      if (droneOsc) { droneOsc.stop(); droneOsc = null; }
    } catch (e) { /* already stopped */ }
    droneGain = null;
    try {
      droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;
      filter.Q.value = 1;
      droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 2);
      droneOsc.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(masterGain);
      droneOsc.start();

      /* Add subtle noise layer */
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      noiseSource.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 200;
      nf.Q.value = 0.3;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, ctx.currentTime);
      ng.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 3);
      noiseSource.connect(nf);
      nf.connect(ng);
      ng.connect(masterGain);
      noiseSource.start();
      droneOsc._noise = noiseSource;
      droneOsc._noiseGain = ng;
    } catch (e) { /* failed to start drone */ }
  }

  function stopDrone() {
    try {
      if (droneGain && ctx) {
        droneGain.gain.setValueAtTime(droneGain.gain.value, ctx.currentTime);
        droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
      if (droneOsc && droneOsc._noiseGain && ctx) {
        droneOsc._noiseGain.gain.setValueAtTime(droneOsc._noiseGain.gain.value, ctx.currentTime);
        droneOsc._noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
      const myId = droneStopId;
      const oldOsc = droneOsc;
      setTimeout(() => {
        if (myId !== droneStopId) return;
        try {
          if (oldOsc) { oldOsc.stop(); }
          if (oldOsc && oldOsc._noise) { oldOsc._noise.stop(); }
        } catch (e) { /* already stopped */ }
        if (droneOsc === oldOsc) droneOsc = null;
        droneGain = null;
      }, 600);
    } catch (e) { /* */ }
  }

  /** Celebratory chime for achievement unlock */
  function achievement() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.10, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.45);
      /* Shimmer octave */
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.04, now + i * 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + i * 0.09);
      osc2.stop(now + i * 0.09 + 0.35);
    });
    haptic([10, 15, 10, 15, 20]);
  }

  return {
    init, resume, toggle, isMuted,
    jump, jetpack, crystal, crash,
    laserBuzz, blackHoleRumble, gravityShift,
    newHighScore, land, achievement,
    startDrone, stopDrone,
  };
})();
