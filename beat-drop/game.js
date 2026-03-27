/* ═══════════════════════════════════════════════════════════
   Beat Drop – Rhythm game with procedural audio
   ═══════════════════════════════════════════════════════════ */

// ── i18n ──
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();
window.addEventListener('langchange', () => { I18N.applyDOM(); renderAchList(); });

// ── Constants ──
const CW = 480, CH = 640;
const LANE_W = CW / 4;
const STRIKE_Y = 560;
const NOTE_R = 18;
let PERFECT_PX = 12;
let GOOD_PX = 30;
let MISS_PX = 50;
let BASE_BPM = 90;
let BPM_INC = 0.5;
let MAX_BPM = 180;
let MAX_LIVES = 5;
const LANE_COLORS = ['#e84393', '#a29bfe', '#fd79a8', '#fab1a0'];
const LANE_KEYS = ['d', 'f', 'j', 'k'];

// ── Difficulty presets ──
const DIFFICULTIES = {
  easy:   { BASE_BPM: 70, BPM_INC: 0.3, MAX_BPM: 140, MAX_LIVES: 7, PERFECT_PX: 18, GOOD_PX: 40, MISS_PX: 60, speedFactor: 0.85 },
  medium: { BASE_BPM: 90, BPM_INC: 0.5, MAX_BPM: 180, MAX_LIVES: 5, PERFECT_PX: 12, GOOD_PX: 30, MISS_PX: 50, speedFactor: 1.0 },
  hard:   { BASE_BPM: 110, BPM_INC: 0.8, MAX_BPM: 200, MAX_LIVES: 3, PERFECT_PX: 8, GOOD_PX: 22, MISS_PX: 40, speedFactor: 1.2 },
};
let difficulty = localStorage.getItem('beatDropDifficulty') || 'medium';

function applyDifficulty() {
  const d = DIFFICULTIES[difficulty];
  BASE_BPM = d.BASE_BPM; BPM_INC = d.BPM_INC; MAX_BPM = d.MAX_BPM;
  MAX_LIVES = d.MAX_LIVES; PERFECT_PX = d.PERFECT_PX; GOOD_PX = d.GOOD_PX; MISS_PX = d.MISS_PX;
}
applyDifficulty();

// ── Canvas ──
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Themes ──
const THEMES = {
  neon:       { name: () => I18N.t('bdThemeNeon')       || 'Neon',       bg: '#1a1028', bg2: '#100a1e', laneBg: 'rgba(232,67,147,0.03)' },
  vapor:      { name: () => I18N.t('bdThemeVapor')      || 'Vapor',      bg: '#2d1b3d', bg2: '#1a0a28', laneBg: 'rgba(162,155,254,0.04)' },
  monochrome: { name: () => I18N.t('bdThemeMonochrome') || 'Monochrome', bg: '#1a1a2e', bg2: '#0a0a1e', laneBg: 'rgba(255,255,255,0.02)' },
  sakura:     { name: () => I18N.t('bdThemeSakura')     || 'Sakura',     bg: '#2d1020', bg2: '#1a0a18', laneBg: 'rgba(255,150,180,0.04)' },
  midnight:   { name: () => I18N.t('bdThemeMidnight') || 'Midnight',  bg: '#08081a', bg2: '#040410', laneBg: 'rgba(80,80,200,0.03)', premium: true },
  tropical:   { name: () => I18N.t('bdThemeTropical') || 'Tropical',  bg: '#0a2018', bg2: '#061410', laneBg: 'rgba(0,255,150,0.03)', premium: true },
};

const BD_PREMIUM_ITEMS = ['midnight', 'tropical'];
function _bdShopUnlocked() {
  try { return JSON.parse(localStorage.getItem('bdShopUnlocked')) || []; } catch(e) { return []; }
}

let currentTheme = localStorage.getItem('beatDropTheme') || 'neon';

const themeSelect = document.getElementById('themeSelect');
for (const [key, th] of Object.entries(THEMES)) {
  const opt = document.createElement('option');
  var label = th.name();
  if (th.premium && _bdShopUnlocked().indexOf(key) === -1) label += ' \uD83D\uDD12';
  opt.value = key; opt.textContent = label;
  if (key === currentTheme) opt.selected = true;
  themeSelect.appendChild(opt);
}
themeSelect.addEventListener('change', () => {
  if (THEMES[themeSelect.value] && THEMES[themeSelect.value].premium && _bdShopUnlocked().indexOf(themeSelect.value) === -1) {
    themeSelect.value = currentTheme;
    if (typeof Shop !== 'undefined') Shop.open();
    return;
  }
  currentTheme = themeSelect.value;
  localStorage.setItem('beatDropTheme', currentTheme);
  document.body.className = currentTheme === 'neon' ? '' : `theme-${currentTheme}`;
});
if (currentTheme !== 'neon') document.body.className = `theme-${currentTheme}`;

// ── Difficulty selector ──
const difficultySelect = document.getElementById('difficultySelect');
difficultySelect.value = difficulty;
difficultySelect.addEventListener('change', () => {
  difficulty = difficultySelect.value;
  localStorage.setItem('beatDropDifficulty', difficulty);
  applyDifficulty();
});

// ── Practice mode ──
let practiceMode = false;
const practiceToggle = document.getElementById('practiceToggle');
practiceToggle.addEventListener('change', () => { practiceMode = practiceToggle.value === 'on'; });

// ── Procedural Audio Engine ──
const AudioEngine = (() => {
  let actx, master, muted = localStorage.getItem('beatDropMuted') === '1';

  function init() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(actx.destination);
  }
  function resume() { if (actx && actx.state === 'suspended') actx.resume(); }
  function toggle() {
    muted = !muted;
    localStorage.setItem('beatDropMuted', muted ? '1' : '0');
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  function isMuted() { return muted; }

  // Kick drum: sine 150→40Hz pitch drop
  function playKick() {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.1);
    g.gain.setValueAtTime(0.6, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.15);
  }

  // Hi-hat: noise through highpass
  function playHiHat() {
    if (!actx || muted) return;
    const dur = 0.05;
    const bufSize = actx.sampleRate * dur;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = buf;
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 8000;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.15, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    src.connect(hp); hp.connect(g); g.connect(master);
    src.start(); src.stop(actx.currentTime + dur);
  }

  // Snare: noise + sine 200Hz
  function playSnare() {
    if (!actx || muted) return;
    const dur = 0.12;
    // Noise part
    const bufSize = actx.sampleRate * dur;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = buf;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.2, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    src.connect(g); g.connect(master);
    src.start(); src.stop(actx.currentTime + dur);
    // Tone part
    const o = actx.createOscillator();
    const g2 = actx.createGain();
    o.type = 'sine'; o.frequency.value = 200;
    g2.gain.setValueAtTime(0.3, actx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);
    o.connect(g2); g2.connect(master);
    o.start(); o.stop(actx.currentTime + 0.08);
  }

  // Bass synth (combo 25+)
  function playBass(note) {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sawtooth'; o.frequency.value = note || 65;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 200;
    g.gain.setValueAtTime(0.15, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.2);
  }

  // Melody (combo 50+)
  function playMelody(note) {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'triangle'; o.frequency.value = note || 440;
    g.gain.setValueAtTime(0.12, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.15);
  }

  // Hit sounds
  function playPerfectHit() {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.3, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.12);
  }

  function playGoodHit() {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine'; o.frequency.value = 660;
    g.gain.setValueAtTime(0.2, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.1);
  }

  function playMissHit() {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 110;
    g.gain.setValueAtTime(0.2, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.15);
  }

  function playGameOver() {
    if (!actx || muted) return;
    [330, 294, 262].forEach((f, i) => {
      setTimeout(() => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.2, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
        o.connect(g); g.connect(master);
        o.start(); o.stop(actx.currentTime + 0.3);
      }, i * 200);
    });
  }

  return { init, resume, toggle, isMuted, playKick, playHiHat, playSnare, playBass, playMelody, playPerfectHit, playGoodHit, playMissHit, playGameOver };
})();

// ── Mute / Fullscreen ──
const muteBtn = document.getElementById('muteButton');
muteBtn.textContent = AudioEngine.isMuted() ? '\u{1F507}' : '\u{1F50A}';
muteBtn.addEventListener('click', () => {
  AudioEngine.init(); AudioEngine.resume();
  muteBtn.textContent = AudioEngine.toggle() ? '\u{1F507}' : '\u{1F50A}';
});

let isFullscreen = false;
function updateCanvasSize() {
  if (isFullscreen) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 52;
    const aspect = CW / CH;
    let w, h;
    if (screenW / screenH > aspect) { h = screenH; w = Math.floor(h * aspect); }
    else { w = screenW; h = Math.floor(w / aspect); }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  } else {
    canvas.style.width = '';
    canvas.style.height = '';
  }
}
document.getElementById('fullscreenButton').addEventListener('click', () => {
  const el = document.getElementById('gameContainer');
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
  }
});
document.addEventListener('fullscreenchange', () => { isFullscreen = !!document.fullscreenElement; requestAnimationFrame(updateCanvasSize); });
document.addEventListener('webkitfullscreenchange', () => { isFullscreen = !!document.webkitFullscreenElement; requestAnimationFrame(updateCanvasSize); });
window.addEventListener('resize', () => { if (isFullscreen) updateCanvasSize(); });

// ── Achievements ──
const ACH = [
  { id: 'bdFirstBeat',     icon: '\u{1F3B5}', title: () => I18N.t('achBdFirstBeat')     || 'First Beat',     desc: () => I18N.t('achBdFirstBeatDesc')     || 'Hit your first note',    check: s => s.totalHits >= 1 },
  { id: 'bdOnFire',        icon: '\u{1F525}', title: () => I18N.t('achBdOnFire')        || 'On Fire',        desc: () => I18N.t('achBdOnFireDesc')        || '25 combo',               check: s => s.bestCombo >= 25 },
  { id: 'bdUnstoppable',   icon: '\u{26A1}',  title: () => I18N.t('achBdUnstoppable')   || 'Unstoppable',    desc: () => I18N.t('achBdUnstoppableDesc')   || '100 combo',              check: s => s.bestCombo >= 100 },
  { id: 'bdTenGrand',      icon: '\u{1F4B0}', title: () => I18N.t('achBdTenGrand')      || 'Ten Grand',      desc: () => I18N.t('achBdTenGrandDesc')      || 'Score 10,000',           check: s => s.bestScore >= 10000 },
  { id: 'bdRhythmMaster',  icon: '\u{1F451}', title: () => I18N.t('achBdRhythmMaster')  || 'Rhythm Master',  desc: () => I18N.t('achBdRhythmMasterDesc')  || 'Score 50,000',           check: s => s.bestScore >= 50000 },
  { id: 'bdPerfection',    icon: '\u{2B50}',  title: () => I18N.t('achBdPerfection')    || 'Perfection',     desc: () => I18N.t('achBdPerfectionDesc')    || '20 perfect streak',      check: s => s.bestPerfectStreak >= 20 },
  { id: 'bdSpeedDemon',    icon: '\u{1F3CE}', title: () => I18N.t('achBdSpeedDemon')    || 'Speed Demon',    desc: () => I18N.t('achBdSpeedDemonDesc')    || 'Reach 160 BPM',          check: s => s.maxBPM >= 160 },
  { id: 'bdFullCombo50',   icon: '\u{1F48E}', title: () => I18N.t('achBdFullCombo50')   || 'Full Combo 50',  desc: () => I18N.t('achBdFullCombo50Desc')   || '50 notes no miss',       check: s => s.bestCombo >= 50 },
];

let achData = JSON.parse(localStorage.getItem('beatDropAch') || '{"unlocked":[],"stats":{"bestScore":0,"bestCombo":0,"bestPerfectStreak":0,"totalHits":0,"maxBPM":0}}');
let achQueue = [];

function saveAch() { localStorage.setItem('beatDropAch', JSON.stringify(achData)); }
function checkAch() {
  for (const a of ACH) {
    if (!achData.unlocked.includes(a.id) && a.check(achData.stats)) {
      achData.unlocked.push(a.id);
      achQueue.push(a);
    }
  }
  saveAch();
  if (achQueue.length) showAchPopup();
}
function showAchPopup() {
  if (!achQueue.length) return;
  const a = achQueue.shift();
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementPopupIcon').textContent = a.icon;
  document.getElementById('achievementPopupTitle').textContent = a.title();
  document.getElementById('achievementPopupDesc').textContent = a.desc();
  popup.classList.add('show');
  setTimeout(() => { popup.classList.remove('show'); setTimeout(showAchPopup, 300); }, 3000);
}
function renderAchList() {
  const list = document.getElementById('achievementsList');
  list.innerHTML = '';
  for (const a of ACH) {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (achData.unlocked.includes(a.id) ? ' unlocked' : '');
    el.innerHTML = `<span class="achievement-item__icon">${a.icon}</span><span>${a.title()}</span>`;
    list.appendChild(el);
  }
}
renderAchList();
document.getElementById('achievementsToggle').addEventListener('click', () => {
  document.getElementById('achievementsList').classList.toggle('open');
});

// ── Leaderboard ──
let lbReady = false;
function initLB() {
  if (lbReady) return;
  try { const p = Leaderboard.createPanel('beat-drop'); document.getElementById('leaderboardPanel').appendChild(p); lbReady = true; } catch (e) {}
}
document.getElementById('leaderboardToggle').addEventListener('click', () => {
  initLB();
  const p = document.getElementById('leaderboardPanel');
  p.style.display = p.style.display === 'none' ? '' : 'none';
});

// ── Game State ──
let notes = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('beatDropBest') || '0');
let combo = 0;
let sessionBestCombo = 0;
let multiplier = 1;
let perfectStreak = 0;
let lives = MAX_LIVES;
let bpm = BASE_BPM;
let gameActive = false;
let gameOver = false;
let time = 0;
let beatTime = 0;
let beatCount = 0;
let judgments = []; // floating judgment text
let receptorPulse = [0, 0, 0, 0]; // per-lane pulse
let lastNoteLane = -1;
let bgHue = 200;
let totalHits = 0;

document.getElementById('bestScore').textContent = bestScore;

function getSpeedMultiplier() {
  const base = DIFFICULTIES[difficulty].speedFactor;
  return practiceMode ? base * 0.5 : base;
}

function resetGame() {
  const oldCard = document.querySelector('.arc-scorecard');
  if (oldCard) oldCard.remove();
  applyDifficulty();
  notes = [];
  score = 0;
  combo = 0;
  sessionBestCombo = 0;
  multiplier = 1;
  perfectStreak = 0;
  lives = practiceMode ? 999 : MAX_LIVES;
  bpm = BASE_BPM;
  gameActive = true;
  gameOver = false;
  time = 0;
  beatTime = 0;
  beatCount = 0;
  judgments = [];
  receptorPulse = [0, 0, 0, 0];
  lastNoteLane = -1;
  bgHue = 200;
  totalHits = 0;
  document.getElementById('score').textContent = '0';
  AudioEngine.init();
  AudioEngine.resume();
}

function spawnNote() {
  // 1-2 simultaneous notes, no same-lane consecutive
  const count = Math.random() < 0.3 ? 2 : 1;
  const available = [0, 1, 2, 3].filter(l => l !== lastNoteLane);
  const lanes = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    lanes.push(available[idx]);
    available.splice(idx, 1);
  }
  for (const lane of lanes) {
    const isHold = bpm >= 150 && Math.random() < 0.15;
    notes.push({
      lane,
      y: -NOTE_R,
      hit: false,
      missed: false,
      isHold,
      holdBeats: isHold ? 1 + Math.floor(Math.random() * 3) : 0,
      holdProgress: 0,
      holding: false,
    });
  }
  if (lanes.length) lastNoteLane = lanes[lanes.length - 1];
}

function hitNote(lane) {
  if (!gameActive || gameOver) return;

  // Find closest unhit note in this lane near strike zone
  let closest = null;
  let closestDist = Infinity;
  for (const n of notes) {
    if (n.lane !== lane || n.hit || n.missed) continue;
    const dist = Math.abs(n.y - STRIKE_Y);
    if (dist < closestDist && dist < MISS_PX) {
      closest = n;
      closestDist = dist;
    }
  }

  if (!closest) return;

  const dist = Math.abs(closest.y - STRIKE_Y);
  let judgment, pts;

  if (dist <= PERFECT_PX) {
    judgment = I18N.t('bdPerfect') || 'PERFECT';
    pts = 100;
    perfectStreak++;
    AudioEngine.playPerfectHit();
  } else if (dist <= GOOD_PX) {
    judgment = I18N.t('bdGood') || 'GOOD';
    pts = 50;
    perfectStreak = 0;
    AudioEngine.playGoodHit();
  } else {
    judgment = I18N.t('bdMiss') || 'MISS';
    pts = 0;
    perfectStreak = 0;
    combo = 0;
    multiplier = 1;
    AudioEngine.playMissHit();
  }

  if (pts > 0) {
    closest.hit = true;
    combo++;
    if (combo > sessionBestCombo) sessionBestCombo = combo;
    totalHits++;
    multiplier = Math.min(8, 1 + Math.floor(combo / 10));
    score += pts * multiplier;
    bpm = Math.min(MAX_BPM, BASE_BPM + totalHits * BPM_INC);
    document.getElementById('score').textContent = score;
    receptorPulse[lane] = 1;
  } else if (!practiceMode) {
    closest.missed = true;
    lives--;
    if (lives <= 0) endGame();
  }

  // Floating judgment
  judgments.push({
    text: judgment + (pts > 0 ? ` +${pts * multiplier}` : ''),
    x: lane * LANE_W + LANE_W / 2,
    y: STRIKE_Y - 30,
    life: 1,
    color: pts === 100 ? '#ffd700' : pts === 50 ? '#00d2ff' : '#ff4444',
  });
}

function endGame() {
  gameActive = false;
  gameOver = true;
  AudioEngine.playGameOver();

  // Stats (skip in practice mode)
  if (!practiceMode) {
    if (score > achData.stats.bestScore) achData.stats.bestScore = score;
    if (sessionBestCombo > achData.stats.bestCombo) achData.stats.bestCombo = sessionBestCombo;
    if (perfectStreak > achData.stats.bestPerfectStreak) achData.stats.bestPerfectStreak = perfectStreak;
    achData.stats.totalHits += totalHits;
    if (bpm > achData.stats.maxBPM) achData.stats.maxBPM = bpm;
    checkAch();
  }

  const prevBest = bestScore;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('beatDropBest', bestScore);
    document.getElementById('bestScore').textContent = bestScore;
  }

  if (!practiceMode) {
    try { initLB(); Leaderboard.submitScore('beat-drop', score); } catch (e) {}
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('beat-drop', score);
      document.body.appendChild(Arcade.createScoreCard('beat-drop', score, prevBest));
    }
  }
}

// ── Controls ──
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  const laneIdx = LANE_KEYS.indexOf(key);
  if (laneIdx >= 0) {
    e.preventDefault();
    if (!gameActive && !gameOver) { resetGame(); return; }
    if (gameOver) { resetGame(); return; }
    hitNote(laneIdx);
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (!gameActive && !gameOver) resetGame();
    if (gameOver) resetGame();
  }
});

// Touch controls
document.querySelectorAll('.touch-btn').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    const lane = parseInt(btn.dataset.lane);
    if (!gameActive && !gameOver) { resetGame(); return; }
    if (gameOver) { resetGame(); return; }
    hitNote(lane);
  });
});

canvas.addEventListener('pointerdown', e => {
  if (!gameActive && !gameOver) { resetGame(); return; }
  if (gameOver) { resetGame(); return; }
  // Determine lane from touch position
  const rect = canvas.getBoundingClientRect();
  const scale = CW / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const lane = Math.floor(x / LANE_W);
  if (lane >= 0 && lane < 4) hitNote(lane);
});

document.getElementById('restartButton').addEventListener('click', resetGame);
document.addEventListener('arcade-restart', resetGame);

// ── Beat-driven audio ──
const bassNotes = [65.41, 73.42, 82.41, 87.31]; // C2, D2, E2, F2
const melodyNotes = [523.25, 587.33, 659.25, 698.46, 783.99]; // C5-G5

function playBeatAudio() {
  const beat = beatCount % 8;
  const speedMul = getSpeedMultiplier();

  // Kick on 1,3 (beats 0,4 in 8th-note grid)
  if (beat === 0 || beat === 4) AudioEngine.playKick();

  // Hi-hat every 8th note
  AudioEngine.playHiHat();

  // Snare on 2,4 (beats 2,6 in 8th-note grid)
  if (beat === 2 || beat === 6) AudioEngine.playSnare();

  // Dynamic layering based on combo
  if (combo >= 25 && (beat === 0 || beat === 4)) {
    AudioEngine.playBass(bassNotes[beatCount % bassNotes.length]);
  }
  if (combo >= 50 && beat % 2 === 0) {
    AudioEngine.playMelody(melodyNotes[beatCount % melodyNotes.length]);
  }
}

// ── Update ──
function update(dt) {
  if (!gameActive) return;

  const speedMul = getSpeedMultiplier();
  time += dt * speedMul;

  // Beat timing (8th notes)
  const eighthDur = 60 / bpm / 2;
  beatTime += dt * speedMul;
  if (beatTime >= eighthDur) {
    beatTime -= eighthDur;
    beatCount++;
    playBeatAudio();

    // Spawn notes on quarter beats (every 2 eighth notes)
    if (beatCount % 2 === 0) spawnNote();
  }

  // Move notes
  const noteSpeed = (bpm / BASE_BPM) * 3.5 * speedMul;
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    if (n.hit) { notes.splice(i, 1); continue; }
    n.y += noteSpeed * dt * 60;

    // Check for miss
    if (!n.missed && n.y > STRIKE_Y + MISS_PX) {
      n.missed = true;
      combo = 0;
      multiplier = 1;
      perfectStreak = 0;
      if (!practiceMode) {
        lives--;
        if (lives <= 0) { endGame(); return; }
      }
      judgments.push({
        text: I18N.t('bdMiss') || 'MISS',
        x: n.lane * LANE_W + LANE_W / 2,
        y: STRIKE_Y - 30,
        life: 1,
        color: '#ff4444',
      });
    }

    // Remove off-screen
    if (n.y > CH + 50) notes.splice(i, 1);
  }

  // Update judgments
  for (let i = judgments.length - 1; i >= 0; i--) {
    judgments[i].life -= dt * 2;
    judgments[i].y -= 40 * dt;
    if (judgments[i].life <= 0) judgments.splice(i, 1);
  }

  // Receptor pulse decay
  for (let i = 0; i < 4; i++) {
    if (receptorPulse[i] > 0) receptorPulse[i] -= dt * 5;
  }

  // BG hue shift
  bgHue = 200 + (bpm - BASE_BPM) * 2;
}

// ── Render ──
function render() {
  const theme = THEMES[currentTheme];

  // Background with hue shift
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
  bgGrad.addColorStop(0, theme.bg);
  bgGrad.addColorStop(1, theme.bg2 || '#100a1e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CW, CH);

  // Sparkle particles (DTI style)
  for (let i = 0; i < 12; i++) {
    const sx = (Math.sin(time * 0.6 + i * 2.0) * 0.4 + 0.5) * CW;
    const sy = (Math.cos(time * 0.4 + i * 1.8) * 0.3 + 0.2) * CH;
    const a = 0.08 + Math.sin(time * 2.0 + i) * 0.06;
    ctx.fillStyle = `rgba(232,67,147,${a})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane backgrounds
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = theme.laneBg;
    ctx.fillRect(i * LANE_W, 0, LANE_W, CH);

    // Lane dividers
    ctx.strokeStyle = 'rgba(232,67,147,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(i * LANE_W, 0);
    ctx.lineTo(i * LANE_W, CH);
    ctx.stroke();
  }

  // Strike zone line
  ctx.strokeStyle = 'rgba(232,67,147,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, STRIKE_Y);
  ctx.lineTo(CW, STRIKE_Y);
  ctx.stroke();

  // Receptor circles
  for (let i = 0; i < 4; i++) {
    const cx = i * LANE_W + LANE_W / 2;
    const pulse = receptorPulse[i];
    const r = NOTE_R + pulse * 8;

    ctx.save();
    ctx.shadowBlur = 10 + pulse * 15;
    ctx.shadowColor = LANE_COLORS[i];
    ctx.strokeStyle = LANE_COLORS[i];
    ctx.lineWidth = 2 + pulse * 2;
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.beginPath();
    ctx.arc(cx, STRIKE_Y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Key labels
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232,167,197,${0.3 + pulse * 0.5})`;
    ctx.fillText(LANE_KEYS[i].toUpperCase(), cx, STRIKE_Y + 5);
  }

  // Notes
  for (const n of notes) {
    if (n.hit || n.y < -NOTE_R * 2) continue;
    const cx = n.lane * LANE_W + LANE_W / 2;
    const color = LANE_COLORS[n.lane];

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;

    if (n.missed) {
      ctx.globalAlpha = 0.3;
    }

    // Note circle
    const grad = ctx.createRadialGradient(cx, n.y, 2, cx, n.y, NOTE_R);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, color + '80');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, n.y, NOTE_R, 0, Math.PI * 2);
    ctx.fill();

    // Hold note tail
    if (n.isHold && !n.missed) {
      const tailH = n.holdBeats * 40;
      ctx.fillStyle = color + '40';
      ctx.fillRect(cx - 8, n.y - tailH, 16, tailH);
      ctx.fillStyle = color;
      ctx.fillRect(cx - 8, n.y - tailH, 16, 3);
    }

    ctx.restore();
  }

  // Floating judgments
  for (const j of judgments) {
    ctx.save();
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = j.life;
    ctx.fillStyle = j.color;
    ctx.fillText(j.text, j.x, j.y);
    ctx.restore();
  }

  // HUD overlay on canvas
  // Combo
  if (combo > 0) {
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232,67,147,${0.3 + Math.min(combo / 50, 0.7)})`;
    ctx.fillText(`${combo}x`, CW / 2, 50);

    if (multiplier > 1) {
      ctx.font = '14px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(253,121,168,0.6)';
      ctx.fillText(`x${multiplier}`, CW / 2, 70);
    }
  }

  // Combo milestones
  if (combo === 25 || combo === 50 || combo === 100) {
    ctx.save();
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e84393';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#e84393';
    ctx.fillText(`${combo} ${I18N.t('bdCombo') || 'COMBO!'}`, CW / 2, CH / 2);
    ctx.restore();
  }

  // Lives
  if (!practiceMode) {
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,67,147,0.5)';
    const hearts = '\u2764'.repeat(Math.max(0, lives));
    ctx.fillText(hearts, 10, 25);
  }

  // BPM
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(162,155,254,0.4)';
  ctx.fillText(`${Math.round(bpm)} ${I18N.t('bdBPM') || 'BPM'}`, CW - 10, 25);

  // Practice mode indicator
  if (practiceMode) {
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,255,136,0.5)';
    ctx.fillText(I18N.t('bdPractice') || 'PRACTICE', 10, 25);
  }

  // Game over overlay
  if (gameOver) {
    ctx.fillStyle = 'rgba(26,16,40,0.75)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e84393';
    ctx.fillText(I18N.t('gameOver') || 'Game Over', CW / 2, CH / 2 - 40);
    ctx.font = '24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232,67,147,0.7)';
    ctx.fillText(`${I18N.t('score') || 'Score'}: ${score}`, CW / 2, CH / 2 + 5);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(253,121,168,0.5)';
    ctx.fillText(`${I18N.t('bdBestCombo') || 'Best Combo'}: ${sessionBestCombo}`, CW / 2, CH / 2 + 35);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,200,220,0.4)';
    ctx.fillText(I18N.t('tapToRestart') || 'Tap to restart', CW / 2, CH / 2 + 70);
  }

  // Start screen
  if (!gameActive && !gameOver) {
    ctx.fillStyle = 'rgba(26,16,40,0.7)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e84393';
    ctx.fillText(I18N.t('beatDropTitle') || 'Beat Drop', CW / 2, CH / 2 - 30);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232,67,147,0.6)';
    ctx.fillText(I18N.t('bdKeyGuide') || 'D  F  J  K', CW / 2, CH / 2 + 10);
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,200,220,0.4)';
    ctx.fillText(I18N.t('tapToStart') || 'Tap or press any key to start', CW / 2, CH / 2 + 40);
  }
}

// ── Game loop ──
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ── Ko-fi Shop ──
if (typeof Shop !== 'undefined') {
  Shop.init({
    gameId: 'beat-drop',
    buttonTarget: '#shopBtn',
    bundles: [
      { id: 'beatpremium', name: 'Beat Premium', desc: 'Midnight & Tropical themes', price: '~$1',
        checkoutUrl: 'https://YOUR_STORE.lemonsqueezy.com/buy/BEAT_PRODUCT_ID', items: ['midnight', 'tropical'] },
    ],
    codes: { 'BEATPRO2026': 'beatpremium' },
    onUnlock: function (itemIds) {
      var arr = _bdShopUnlocked();
      itemIds.forEach(function (id) { if (arr.indexOf(id) === -1) arr.push(id); });
      localStorage.setItem('bdShopUnlocked', JSON.stringify(arr));
    }
  });
}
