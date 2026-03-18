/* Signal Lost — Procedural Audio (Web Audio API) */
var SLAudio = (function () {
  'use strict';

  var ctx = null;
  var muted = false;
  var masterGain = null;

  // Persistent nodes
  var heartOsc = null, heartGain = null;
  var droneOsc = null, droneGain = null;
  var droneOsc2 = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function gain() { return muted ? 0 : 1; }

  /* ── Heartbeat ── */
  function startHeartbeat() {
    var c = getCtx();
    if (heartOsc) return;
    heartOsc = c.createOscillator();
    heartOsc.type = 'sine';
    heartOsc.frequency.value = 40;
    heartGain = c.createGain();
    heartGain.gain.value = 0;
    heartOsc.connect(heartGain);
    heartGain.connect(masterGain);
    heartOsc.start();
  }

  function setHeartbeat(intensity) {
    if (!heartGain) return;
    // intensity 0-1: controls volume and pulse rate
    var vol = Math.min(0.3, intensity * 0.3) * gain();
    heartGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.1);
    if (heartOsc) {
      heartOsc.frequency.setTargetAtTime(35 + intensity * 25, ctx.currentTime, 0.1);
    }
  }

  /* ── Ambient drone ── */
  function startDrone() {
    var c = getCtx();
    if (droneOsc) return;
    droneOsc = c.createOscillator();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.value = 55;
    droneOsc2 = c.createOscillator();
    droneOsc2.type = 'sine';
    droneOsc2.frequency.value = 55.5; // slight detune for unease
    droneGain = c.createGain();
    droneGain.gain.value = 0;
    var filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 2;
    droneOsc.connect(filter);
    droneOsc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start();
    droneOsc2.start();
  }

  function setDrone(level) {
    if (!droneGain) return;
    var vol = Math.min(0.15, level * 0.15) * gain();
    droneGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.3);
  }

  /* ── Static burst ── */
  function playStatic(duration, volume) {
    var c = getCtx();
    duration = duration || 0.15;
    volume = (volume || 0.2) * gain();
    var bufLen = Math.floor(c.sampleRate * duration);
    var buf = c.createBuffer(1, bufLen, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    var bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 3000;
    bp.Q.value = 0.5;
    src.connect(bp);
    bp.connect(g);
    g.connect(masterGain);
    src.start();
    src.stop(c.currentTime + duration);
  }

  /* ── Camera switch click ── */
  function cameraSwitch() {
    playStatic(0.08, 0.15);
  }

  /* ── Door lock/unlock ── */
  function doorLock() {
    var c = getCtx();
    var vol = 0.25 * gain();
    var osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 180;
    var g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.12);
    // metallic click
    playStatic(0.05, 0.1);
  }

  /* ── Footstep (distant) ── */
  function footstep() {
    var c = getCtx();
    var vol = 0.12 * gain();
    var bufLen = Math.floor(c.sampleRate * 0.08);
    var buf = c.createBuffer(1, bufLen, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.2));
    }
    var src = c.createBufferSource();
    src.buffer = buf;
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    var g = c.createGain();
    g.gain.value = vol;
    src.connect(lp);
    lp.connect(g);
    g.connect(masterGain);
    src.start();
  }

  /* ── Whisper ── */
  function whisper() {
    var c = getCtx();
    var vol = 0.08 * gain();
    var duration = 0.8;
    var bufLen = Math.floor(c.sampleRate * duration);
    var buf = c.createBuffer(1, bufLen, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufLen; i++) {
      var env = Math.sin(Math.PI * i / bufLen);
      data[i] = (Math.random() * 2 - 1) * env * 0.5;
    }
    var src = c.createBufferSource();
    src.buffer = buf;
    var bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 3;
    var g = c.createGain();
    g.gain.value = vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(masterGain);
    src.start();
  }

  /* ── Scare chord ── */
  function scare() {
    var c = getCtx();
    var vol = 0.35 * gain();
    var freqs = [110, 116.5, 155.6, 233.1]; // dissonant
    freqs.forEach(function (f, i) {
      var osc = c.createOscillator();
      osc.type = i < 2 ? 'sawtooth' : 'square';
      osc.frequency.value = f;
      var g = c.createGain();
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(c.currentTime + 1.5);
    });
    playStatic(0.5, 0.4);
  }

  /* ── Anomaly sound ── */
  function anomaly() {
    var c = getCtx();
    var vol = 0.1 * gain();
    var osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 2000 + Math.random() * 1000;
    osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.4);
    var g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.5);
  }

  /* ── Toggle mute ── */
  function toggleMute() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    }
    return muted;
  }

  function init() {
    getCtx();
    startHeartbeat();
    startDrone();
  }

  return {
    init: init,
    setHeartbeat: setHeartbeat,
    setDrone: setDrone,
    playStatic: playStatic,
    cameraSwitch: cameraSwitch,
    doorLock: doorLock,
    footstep: footstep,
    whisper: whisper,
    scare: scare,
    anomaly: anomaly,
    toggleMute: toggleMute,
    isMuted: function () { return muted; }
  };
})();
