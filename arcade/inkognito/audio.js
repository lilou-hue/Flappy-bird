/**
 * Procedural audio engine for Inkognito.
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
    const saved = localStorage.getItem("inkognitoMuted");
    muted = saved === "true";
    masterGain.gain.value = muted ? 0 : 1;
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function toggle() {
    muted = !muted;
    localStorage.setItem("inkognitoMuted", String(muted));
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.05);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  /* Helpers */
  function playTone(freq, duration, type, volume, startTime) {
    if (!ctx) return;
    const t = startTime || ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  function playSweep(startFreq, endFreq, duration, type, volume) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(volume || 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, volume, filterFreq, filterType, filterQ) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType || "bandpass";
    filter.frequency.value = filterFreq || 1000;
    filter.Q.value = filterQ || 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
  }

  /* Sound effects */

  /** Soft scratch sound while drawing */
  function stroke() {
    if (!ctx) return;
    playNoise(0.04, 0.03, 3000, "bandpass", 2);
  }

  /** Tick sound for countdown */
  function tick() {
    if (!ctx) return;
    playTone(800, 0.08, "triangle", 0.1);
  }

  /** Go / start sound */
  function go() {
    if (!ctx) return;
    playTone(1200, 0.15, "sine", 0.12);
    playTone(1600, 0.15, "sine", 0.08, ctx.currentTime + 0.08);
  }

  /** Correct guess celebration */
  function correct() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      playTone(freq, 0.25, "triangle", 0.12, now + i * 0.07);
    });
    if (navigator.vibrate) navigator.vibrate([40, 20, 60]);
  }

  /** Wrong / time-up buzzer */
  function wrong() {
    if (!ctx) return;
    playSweep(400, 150, 0.4, "sawtooth", 0.1);
    if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
  }

  /** Undo pop */
  function undo() {
    if (!ctx) return;
    playTone(500, 0.05, "sine", 0.06);
    playNoise(0.03, 0.03, 2000, "highpass", 1);
  }

  /** Clear whoosh */
  function clear() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
    filter.Q.value = 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
  }

  /** AI confidence rising ping */
  function aiPing() {
    if (!ctx) return;
    playTone(1200, 0.06, "sine", 0.04);
  }

  /** Game over descending doom */
  function gameOver() {
    if (!ctx) return;
    playSweep(500, 60, 1.0, "sawtooth", 0.12);
    if (navigator.vibrate) navigator.vibrate([200, 50, 200]);
  }

  /** Achievement unlock fanfare */
  function achievement() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      playTone(freq, 0.3, "sine", 0.1, now + i * 0.08);
    });
    if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 120]);
  }

  /** New round transition */
  function newRound() {
    if (!ctx) return;
    playTone(660, 0.1, "triangle", 0.08);
    playTone(880, 0.1, "triangle", 0.06, ctx.currentTime + 0.06);
  }

  return {
    init,
    resume,
    toggle,
    isMuted,
    stroke,
    tick,
    go,
    correct,
    wrong,
    undo,
    clear,
    aiPing,
    gameOver,
    achievement,
    newRound,
  };
})();
