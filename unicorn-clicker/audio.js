/* ── Unicorn Fart Clicker — Procedural Audio ── */
const SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let lastFartTime = 0;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      try { muted = localStorage.getItem('ucMuted') === '1'; } catch (_) {}
      masterGain.gain.value = muted ? 0 : 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function getDest() { ensure(); return masterGain || (ctx && ctx.destination); }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('ucMuted', muted ? '1' : '0'); } catch (_) {}
    if (masterGain && ctx) {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.05);
    }
    return muted;
  }
  function isMuted() { return muted; }

  /* ── Fart Sound ── */
  function fart(evolution) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    // Throttle: max ~8 per second
    if (now - lastFartTime < 0.12) return;
    lastFartTime = now;

    // Noise source
    const len = 0.1 + Math.random() * 0.12;
    const rate = c.sampleRate;
    const buf = c.createBuffer(1, rate * len, rate);
    const data = buf.getChannelData(0);
    // Brown noise (integrated white noise)
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = c.createBufferSource();
    src.buffer = buf;

    // Bandpass filter — the "character" knob
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(70 + Math.random() * 50, now);
    bp.frequency.linearRampToValueAtTime(35 + Math.random() * 20, now + len);
    bp.Q.value = 2 + Math.random() * 6;

    // Gain envelope
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.linearRampToValueAtTime(0.8, now + len * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + len);

    src.connect(bp).connect(gain).connect(getDest());
    src.start(now);
    src.stop(now + len);

    // At higher evolutions add a harmonic "toot"
    if (evolution >= 2) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120 + evolution * 30, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + len);
      const og = c.createGain();
      og.gain.setValueAtTime(0.12, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + len);
      osc.connect(og).connect(getDest());
      osc.start(now);
      osc.stop(now + len);
    }
  }

  /* ── Purchase Jingle ── */
  function purchase() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);
      osc.connect(g).connect(getDest());
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  /* ── Evolution Fanfare ── */
  function evolve() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const notes = [392, 440, 523.25, 659.25, 783.99, 1046.5]; // G4→C6
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = c.createGain();
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(getDest());
      osc.start(t);
      osc.stop(t + 0.55);
    });
    // Shimmer noise burst
    const len = 0.6;
    const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    const ns = c.createBufferSource();
    ns.buffer = buf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.15, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + len);
    ns.connect(hp).connect(ng).connect(getDest());
    ns.start(now);
    ns.stop(now + len);
  }

  /* ── Sparkle (auto-fart ambient tick) ── */
  function sparkle() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1800 + Math.random() * 1200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g).connect(getDest());
    osc.start(now);
    osc.stop(now + 0.15);
  }

  return { fart, purchase, evolve, sparkle, toggleMute, isMuted };
})();
