/* ═══════════════════════════════════════════════════════════════
   audio.js  –  Web Audio API sound system
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ctx = null;
  var muted = false;
  var ambientNode = null;
  var ambientGain = null;
  var masterGain = null;

  var MUTE_KEY = 'artOfDoingNothingMuted';

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      muted = localStorage.getItem(MUTE_KEY) === '1';
      masterGain.gain.value = muted ? 0 : 1;
    } catch (e) {
      ctx = null;
    }
  }

  function ensureCtx() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return !!ctx;
  }

  /* ── Voice blips ── */
  var BLIP_FREQ = { low: 180, mid: 320, high: 440 };

  function blip(pitch) {
    if (!ensureCtx() || muted) return;
    var freq = BLIP_FREQ[pitch] || 280;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq + (Math.random() - 0.5) * 40;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }

  /* ── Choice click SFX ── */
  function clickSfx() {
    if (!ensureCtx() || muted) return;
    var bufferSize = ctx.sampleRate * 0.05;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.05);
    var gain = ctx.createGain();
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
  }

  /* ── Meter change tone ── */
  function meterTone(direction) {
    if (!ensureCtx() || muted) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = direction > 0 ? 300 : 500;
    osc.frequency.exponentialRampToValueAtTime(direction > 0 ? 200 : 600, ctx.currentTime + 0.15);
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /* ── Ambient drone ── */
  function startAmbient(baseFreq) {
    if (!ensureCtx()) return;
    stopAmbient();
    ambientNode = ctx.createOscillator();
    ambientGain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    ambientNode.type = 'sine';
    ambientNode.frequency.value = baseFreq || 110;
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    ambientGain.gain.value = muted ? 0 : 0.03;
    ambientNode.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(masterGain);
    ambientNode.start();
  }

  function stopAmbient() {
    if (ambientNode) {
      try { ambientNode.stop(); } catch (e) {}
      ambientNode = null;
    }
  }

  /* ── Mute toggle ── */
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    if (ambientGain) ambientGain.gain.value = muted ? 0 : 0.03;
    return muted;
  }

  function isMuted() { return muted; }

  /* ── Public API ── */
  window.GameAudio = {
    init: init,
    blip: blip,
    clickSfx: clickSfx,
    meterTone: meterTone,
    startAmbient: startAmbient,
    stopAmbient: stopAmbient,
    toggleMute: toggleMute,
    isMuted: isMuted
  };
})();
