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

  function getCtx() { return ctx; }
  function getMaster() { return masterGain; }

  return {
    init,
    resume,
    toggle,
    isMuted,
    getCtx,
    getMaster,
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

/**
 * Background music engine for Dress-Up Game.
 * Procedural looping songs via Web Audio API.
 */
const BGMusic = (() => {
  const N = {
    C3:131,D3:147,E3:165,F3:175,G3:196,A3:220,B3:247,
    C4:262,D4:294,E4:330,F4:349,G4:392,A4:440,B4:494,
    C5:523,D5:587,E5:659,F5:698,G5:784,A5:880,
    R:0
  };

  const SONGS = {
    lofi: {
      name: 'Lo-Fi Chill', bpm: 80,
      melody: [
        {n:N.E4,d:1},{n:N.G4,d:0.5},{n:N.A4,d:0.5},{n:N.G4,d:1},{n:N.E4,d:0.5},{n:N.D4,d:0.5},
        {n:N.C4,d:1},{n:N.D4,d:0.5},{n:N.E4,d:0.5},{n:N.G4,d:1},{n:N.R,d:1},
        {n:N.A4,d:0.5},{n:N.G4,d:0.5},{n:N.E4,d:1},{n:N.D4,d:0.5},{n:N.C4,d:0.5},{n:N.D4,d:1},{n:N.R,d:1},
      ],
      bass: [
        {n:N.C3,d:2},{n:N.A3,d:2},{n:N.F3,d:2},{n:N.G3,d:2},
      ],
      melodyType: 'triangle', bassType: 'sine', melodyVol: 0.06, bassVol: 0.05,
    },
    poppy: {
      name: 'Pop Beat', bpm: 120,
      melody: [
        {n:N.C5,d:0.5},{n:N.E5,d:0.5},{n:N.G5,d:0.5},{n:N.E5,d:0.5},{n:N.C5,d:0.5},{n:N.D5,d:0.5},{n:N.E5,d:1},
        {n:N.D5,d:0.5},{n:N.C5,d:0.5},{n:N.A4,d:0.5},{n:N.C5,d:0.5},{n:N.D5,d:1},{n:N.R,d:1},
        {n:N.E5,d:0.5},{n:N.D5,d:0.5},{n:N.C5,d:0.5},{n:N.E5,d:0.5},{n:N.G5,d:1},{n:N.E5,d:0.5},{n:N.D5,d:0.5},{n:N.C5,d:1},
      ],
      bass: [
        {n:N.C3,d:1},{n:N.R,d:0.5},{n:N.C3,d:0.5},{n:N.G3,d:1},{n:N.R,d:0.5},{n:N.G3,d:0.5},
        {n:N.A3,d:1},{n:N.R,d:0.5},{n:N.A3,d:0.5},{n:N.F3,d:1},{n:N.R,d:0.5},{n:N.F3,d:0.5},
      ],
      melodyType: 'square', bassType: 'triangle', melodyVol: 0.06, bassVol: 0.05,
    },
    dreamy: {
      name: 'Dreamy', bpm: 65,
      melody: [
        {n:N.E4,d:2},{n:N.G4,d:2},{n:N.A4,d:1.5},{n:N.B4,d:0.5},{n:N.A4,d:2},{n:N.R,d:1},
        {n:N.G4,d:1.5},{n:N.E4,d:0.5},{n:N.D4,d:2},{n:N.E4,d:2},{n:N.R,d:1},
      ],
      bass: [
        {n:N.C3,d:3},{n:N.G3,d:3},{n:N.A3,d:3},{n:N.E3,d:3},
      ],
      melodyType: 'sine', bassType: 'sine', melodyVol: 0.07, bassVol: 0.04,
    },
  };

  let currentSong = null;
  let loopTimer = null;
  let playing = false;
  let activeNodes = [];

  function stopAll() {
    playing = false;
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    for (const node of activeNodes) {
      try { node.gain.gain.cancelScheduledValues(0); node.gain.gain.value = 0; node.osc.stop(); } catch (e) {}
    }
    activeNodes = [];
  }

  function scheduleNote(actx, master, freq, startTime, duration, type, vol) {
    if (freq === 0) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    g.gain.setValueAtTime(vol, startTime + Math.max(0.02, duration - 0.03));
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    o.connect(g);
    g.connect(master);
    o.start(startTime);
    o.stop(startTime + duration + 0.01);
    const entry = { osc: o, gain: g };
    activeNodes.push(entry);
    o.onended = () => { const i = activeNodes.indexOf(entry); if (i >= 0) activeNodes.splice(i, 1); };
  }

  function playLoop() {
    if (!playing || !currentSong) return;
    const actx = Audio.getCtx();
    const master = Audio.getMaster();
    if (!actx || !master) return;

    const song = SONGS[currentSong];
    if (!song) return;
    const beatDur = 60 / song.bpm;
    let now = actx.currentTime + 0.05;

    let melodyTime = now;
    for (const note of song.melody) {
      const dur = note.d * beatDur;
      scheduleNote(actx, master, note.n, melodyTime, dur * 0.9, song.melodyType || 'square', song.melodyVol || 0.06);
      melodyTime += dur;
    }

    let bassTime = now;
    const totalMelodyDur = song.melody.reduce((s, n) => s + n.d, 0) * beatDur;
    while (bassTime < now + totalMelodyDur) {
      for (const note of song.bass) {
        const dur = note.d * beatDur;
        if (bassTime >= now + totalMelodyDur) break;
        scheduleNote(actx, master, note.n, bassTime, dur * 0.85, song.bassType || 'triangle', song.bassVol || 0.05);
        bassTime += dur;
      }
    }

    const loopMs = totalMelodyDur * 1000;
    loopTimer = setTimeout(() => { if (playing) playLoop(); }, loopMs - 200);
  }

  function play(songId) {
    stopAll();
    if (!songId || songId === 'none') { currentSong = null; return; }
    currentSong = songId;
    playing = true;
    Audio.init();
    Audio.resume();
    playLoop();
  }

  function stop() { stopAll(); currentSong = null; }
  function getCurrent() { return currentSong; }
  function isPlaying() { return playing; }

  return { play, stop, getCurrent, isPlaying, SONGS };
})();
