/* Rivals — Procedural Audio (Web Audio API, no samples) */
const Audio = (() => {
  let ctx = null, masterGain = null, muted = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    muted = localStorage.getItem('rivalsMuted') === 'true';
    masterGain.gain.value = muted ? 0 : 1;
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function toggle() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.15);
    }
    localStorage.setItem('rivalsMuted', String(muted));
    return muted;
  }

  function isMuted() { return muted; }

  function haptic(pattern) { try { navigator.vibrate(pattern); } catch (_) {} }

  function playTone(freq, dur, type, vol, detune) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + dur);
  }

  function playNoise(dur, vol, filterFreq, filterType) {
    if (!ctx) return;
    var bufSize = ctx.sampleRate * dur;
    var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filt = ctx.createBiquadFilter();
    filt.type = filterType || 'lowpass';
    filt.frequency.value = filterFreq || 3000;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filt); filt.connect(g); g.connect(masterGain);
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + dur);
  }

  function shoot(weapon) {
    if (!ctx) return;
    haptic([15]);
    switch (weapon) {
      case 'pistol':
        playTone(600, 0.08, 'square', 0.12);
        playNoise(0.06, 0.08, 4000);
        break;
      case 'smg':
        playTone(800, 0.04, 'square', 0.08);
        playNoise(0.03, 0.06, 5000);
        break;
      case 'shotgun':
        playTone(200, 0.15, 'sawtooth', 0.15);
        playNoise(0.12, 0.15, 2000);
        haptic([30]);
        break;
      case 'rifle':
        playTone(500, 0.1, 'square', 0.12);
        playNoise(0.08, 0.1, 3500);
        break;
      case 'sniper':
        playTone(300, 0.2, 'sawtooth', 0.18);
        playNoise(0.15, 0.12, 1500);
        playTone(1200, 0.05, 'sine', 0.06);
        haptic([40]);
        break;
      case 'knife':
        playTone(1000, 0.06, 'triangle', 0.08);
        playTone(1500, 0.04, 'triangle', 0.05);
        break;
      default:
        playTone(600, 0.08, 'square', 0.1);
        playNoise(0.06, 0.08, 4000);
    }
  }

  function hit() {
    if (!ctx) return;
    haptic([20]);
    playNoise(0.08, 0.12, 2500);
    playTone(300, 0.06, 'sawtooth', 0.08);
  }

  function kill() {
    if (!ctx) return;
    haptic([30, 50, 30]);
    playTone(880, 0.08, 'square', 0.1);
    setTimeout(function() { playTone(1100, 0.12, 'square', 0.1); }, 80);
  }

  function explode() {
    if (!ctx) return;
    haptic([50, 30, 50]);
    playNoise(0.4, 0.2, 800);
    playTone(80, 0.3, 'sawtooth', 0.15);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
  }

  function buy() {
    if (!ctx) return;
    playTone(880, 0.06, 'sine', 0.1);
    setTimeout(function() { playTone(1320, 0.08, 'sine', 0.1); }, 60);
  }

  function roundStart() {
    if (!ctx) return;
    playTone(440, 0.1, 'square', 0.1);
    setTimeout(function() { playTone(660, 0.1, 'square', 0.1); }, 120);
    setTimeout(function() { playTone(880, 0.15, 'square', 0.12); }, 240);
  }

  function roundEnd() {
    if (!ctx) return;
    playTone(660, 0.15, 'triangle', 0.1);
    setTimeout(function() { playTone(880, 0.15, 'triangle', 0.1); }, 150);
    setTimeout(function() { playTone(1100, 0.2, 'triangle', 0.12); }, 300);
  }

  function reload() {
    if (!ctx) return;
    playTone(1200, 0.03, 'square', 0.06);
    setTimeout(function() { playTone(900, 0.03, 'square', 0.06); }, 40);
  }

  function jump() {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.12);
  }

  function flashbang() {
    if (!ctx) return;
    haptic([60]);
    playTone(4000, 0.3, 'sine', 0.15);
    playNoise(0.2, 0.1, 8000, 'highpass');
  }

  function gameOver() {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 1.2);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 1.5);
  }

  function achievement() {
    if (!ctx) return;
    haptic([30, 50, 30]);
    var notes = [659, 880, 1319];
    notes.forEach(function(f, i) {
      setTimeout(function() { playTone(f, 0.2, 'sine', 0.1); }, i * 120);
    });
  }

  function heal() {
    if (!ctx) return;
    playTone(523, 0.1, 'sine', 0.08);
    setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 100);
    setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200);
  }

  return {
    init: init, resume: resume, toggle: toggle, isMuted: isMuted,
    shoot: shoot, hit: hit, kill: kill, explode: explode,
    buy: buy, roundStart: roundStart, roundEnd: roundEnd,
    reload: reload, jump: jump, flashbang: flashbang,
    gameOver: gameOver, achievement: achievement, heal: heal
  };
})();
