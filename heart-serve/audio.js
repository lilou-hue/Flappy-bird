/* ═══════════════════════════════════════════════════════════════
   HeartServe — audio.js
   Procedural Web Audio sounds
   ═══════════════════════════════════════════════════════════════ */
var HSAudio = (function() {
  'use strict';
  var ctx = null, muted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function play(fn) { if (muted) return; try { fn(getCtx()); } catch(e) {} }

  function hit() {
    play(function(c) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = 800;
      o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
      g.gain.setValueAtTime(0.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + 0.12);
    });
  }

  function score() {
    play(function(c) {
      var t = c.currentTime;
      [660, 880, 1100].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.2);
      });
    });
  }

  function losePoint() {
    play(function(c) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(400, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.3);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + 0.3);
    });
  }

  function heartGain() {
    play(function(c) {
      var t = c.currentTime;
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(800, t);
      o.frequency.exponentialRampToValueAtTime(1600, t + 0.15);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.4);
    });
  }

  function click() {
    play(function(c) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 1000;
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + 0.05);
    });
  }

  function win() {
    play(function(c) {
      var t = c.currentTime;
      [523, 659, 784, 1047].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.25);
      });
    });
  }

  function lose() {
    play(function(c) {
      var t = c.currentTime;
      [400, 350, 300, 250].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.08, t + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.3);
      });
    });
  }

  function serve() {
    play(function(c) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + 0.15);
    });
  }

  function powerUp() {
    play(function(c) {
      var t = c.currentTime;
      [600, 800, 1000, 1200].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.06, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.12);
      });
    });
  }

  function giftGive() {
    play(function(c) {
      var t = c.currentTime;
      [523, 659, 784, 1047, 1319].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.08, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.3);
      });
    });
  }

  function jealousy() {
    play(function(c) {
      var t = c.currentTime;
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.5);
    });
  }

  function fever() {
    play(function(c) {
      var t = c.currentTime;
      [880, 1100, 880, 1100, 1320, 1760].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.07, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.15);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.15);
      });
    });
  }

  function eventFanfare() {
    play(function(c) {
      var t = c.currentTime;
      [392, 523, 659, 784, 1047].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.4);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.4);
      });
    });
  }

  function comboHit(combo) {
    play(function(c) {
      var baseFreq = 800 + Math.min(combo * 30, 1200);
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = baseFreq;
      o.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + 0.12);
    });
  }

  function chaosEvent() {
    play(function(c) {
      var t = c.currentTime;
      [400, 600, 800, 1200, 1600].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(0.06, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.15);
      });
    });
  }

  function death() {
    play(function(c) {
      var t = c.currentTime;
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(500, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.5);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.5);
    });
  }

  function newRecord() {
    play(function(c) {
      var t = c.currentTime;
      [523, 659, 784, 1047, 1319, 1568].forEach(function(f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.3);
      });
    });
  }

  function toggleMute() { muted = !muted; return muted; }
  function isMuted() { return muted; }

  return { hit:hit, score:score, losePoint:losePoint, heartGain:heartGain,
           click:click, win:win, lose:lose, serve:serve, toggleMute:toggleMute,
           isMuted:isMuted, powerUp:powerUp, giftGive:giftGive,
           jealousy:jealousy, fever:fever, eventFanfare:eventFanfare,
           comboHit:comboHit, chaosEvent:chaosEvent, death:death, newRecord:newRecord };
})();
