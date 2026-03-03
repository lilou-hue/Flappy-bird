/**
 * Procedural audio engine for Dress-Up Game.
 * Uses the Web Audio API — no external sound files needed.
 */
const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    const saved = localStorage.getItem('dressUpMuted');
    muted = saved === 'true';
    masterGain.gain.value = muted ? 0 : 1;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function toggle() {
    muted = !muted;
    localStorage.setItem('dressUpMuted', String(muted));
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.15);
    }
    return muted;
  }

  function isMuted() { return muted; }

  /* ── helpers ── */
  function playTone(freq, duration, type, volume, delay) {
    if (!ctx) return;
    const now = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, volume, filterFreq, delay) {
    if (!ctx) return;
    const now = ctx.currentTime + (delay || 0);
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
    filter.frequency.value = filterFreq || 2000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
  }

  /* ── sound effects ── */

  /** Soft click/snap when equipping an item */
  function equip() {
    if (!ctx) return;
    playTone(1200, 0.08, 'sine', 0.1);
    playTone(1800, 0.06, 'sine', 0.06, 0.03);
    playNoise(0.05, 0.04, 4000);
  }

  /** Reverse click when unequipping */
  function unequip() {
    if (!ctx) return;
    playTone(1800, 0.06, 'sine', 0.08);
    playTone(1200, 0.08, 'sine', 0.06, 0.03);
    playNoise(0.04, 0.03, 3000);
  }

  /** Light sparkle ping on color change */
  function colorChange() {
    if (!ctx) return;
    playTone(2400, 0.12, 'sine', 0.07);
    playTone(3200, 0.1, 'sine', 0.04, 0.04);
  }

  /** Quick cascading chimes for randomize (6 ascending notes) */
  function randomize() {
    if (!ctx) return;
    const notes = [523, 659, 784, 988, 1175, 1397];
    notes.forEach((freq, i) => {
      playTone(freq, 0.15, 'sine', 0.08, i * 0.06);
    });
  }

  /** Confirmation 2-note chord on save */
  function save() {
    if (!ctx) return;
    playTone(523, 0.3, 'sine', 0.08);
    playTone(659, 0.3, 'sine', 0.08);
    playTone(784, 0.25, 'sine', 0.06, 0.1);
  }

  /** Energetic countdown jingle for challenge start */
  function challengeStart() {
    if (!ctx) return;
    const notes = [392, 523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(freq, 0.2, 'square', 0.06, i * 0.1);
    });
    playNoise(0.15, 0.05, 5000, 0.5);
  }

  /** Results reveal sweep on challenge end */
  function challengeEnd() {
    if (!ctx) return;
    for (let i = 0; i < 8; i++) {
      playTone(400 + i * 150, 0.25, 'sine', 0.06, i * 0.05);
    }
    playTone(1600, 0.5, 'sine', 0.08, 0.4);
  }

  /** Bright chime for earning a star (call 1-3 times) */
  function starEarn() {
    if (!ctx) return;
    playTone(1047, 0.2, 'sine', 0.1);
    playTone(1319, 0.18, 'sine', 0.08, 0.08);
    playTone(1568, 0.25, 'sine', 0.06, 0.16);
  }

  /** Celebratory 3-note fanfare for achievements */
  function achievement() {
    if (!ctx) return;
    playTone(784, 0.25, 'triangle', 0.1);
    playTone(988, 0.25, 'triangle', 0.1, 0.15);
    playTone(1319, 0.4, 'triangle', 0.12, 0.3);
    playNoise(0.1, 0.04, 6000, 0.3);
  }

  /** Whoosh/transition for character switch */
  function characterSwitch() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
    playNoise(0.15, 0.06, 3000);
  }

  return {
    init,
    resume,
    toggle,
    isMuted,
    equip,
    unequip,
    colorChange,
    randomize,
    save,
    challengeStart,
    challengeEnd,
    starEarn,
    achievement,
    characterSwitch
  };
})();
