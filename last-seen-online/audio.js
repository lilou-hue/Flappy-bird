/* ═══════════════════════════════════════════════════════════════
   Last Seen Online — audio.js
   Procedural Web Audio sounds
   ═══════════════════════════════════════════════════════════════ */
const Audio_LSO = (function () {
  'use strict';

  let ctx = null;
  let muted = false;
  let ambientOsc = null;
  let ambientGain = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(fn) {
    if (muted) return;
    try { fn(getCtx()); } catch (e) { /* silent fail */ }
  }

  /* ── Sound Effects ── */

  function unlock() {
    play(c => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.35);
    });
  }

  function notification() {
    play(c => {
      const t = c.currentTime;
      [880, 1100].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
        osc.connect(gain).connect(c.destination);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.3);
      });
    });
  }

  function messageIn() {
    play(c => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.06);
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.1);
    });
  }

  function messageOut() {
    play(c => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.1);
    });
  }

  function typing() {
    play(c => {
      for (let i = 0; i < 3; i++) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200 + Math.random() * 400;
        gain.gain.setValueAtTime(0.03, c.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.04);
        osc.connect(gain).connect(c.destination);
        osc.start(c.currentTime + i * 0.08);
        osc.stop(c.currentTime + i * 0.08 + 0.04);
      }
    });
  }

  function choiceAppear() {
    play(c => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0.08, c.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 1.2);
    });
  }

  function choiceSelect() {
    play(c => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.25);
    });
  }

  function openChat() {
    play(c => {
      const noise = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.03;
      noise.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.15, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
      noise.connect(filter).connect(gain).connect(c.destination);
      noise.start(c.currentTime);
    });
  }

  function back() {
    play(c => {
      const noise = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.02;
      noise.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
      noise.connect(filter).connect(gain).connect(c.destination);
      noise.start(c.currentTime);
    });
  }

  function ambientTension(level) {
    if (muted || level <= 0) {
      if (ambientOsc) {
        try { ambientOsc.stop(); } catch (e) { /* */ }
        ambientOsc = null;
        ambientGain = null;
      }
      return;
    }
    const c = getCtx();
    if (!ambientOsc) {
      ambientOsc = c.createOscillator();
      ambientGain = c.createGain();
      ambientOsc.type = 'sine';
      ambientOsc.frequency.value = 80;
      ambientGain.gain.value = 0;
      ambientOsc.connect(ambientGain).connect(c.destination);
      ambientOsc.start();
    }
    ambientGain.gain.linearRampToValueAtTime(Math.min(level * 0.06, 0.06), c.currentTime + 0.5);
  }

  function toggleMute() {
    muted = !muted;
    if (muted && ambientOsc) {
      try { ambientOsc.stop(); } catch (e) { /* */ }
      ambientOsc = null;
      ambientGain = null;
    }
    return muted;
  }

  return {
    unlock, notification, messageIn, messageOut, typing,
    choiceAppear, choiceSelect, openChat, back, ambientTension, toggleMute
  };
})();
