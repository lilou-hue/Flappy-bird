/* ═══════════════════════════════════════════════════════════
   Stack Tower – Arcade stacking game
   ═══════════════════════════════════════════════════════════ */

// ── i18n ──
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();
window.addEventListener('langchange', () => { I18N.applyDOM(); renderAchList(); });

// ── Constants ──
const CW = 480, CH = 640;
const BLOCK_H = 28;
const INIT_WIDTH = 200;
const BASE_SPEED = 3.0;
const SPEED_INC = 0.15;
const MAX_SPEED = 9.0;
const PERFECT_THRESHOLD = 4;
const PERFECT_GROW = 4;
const MIN_WIDTH = 8;
const STREAK_THRESHOLD = 3;

// ── Canvas ──
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Themes ──
const THEMES = {
  neon:   { name: () => I18N.t('stThemeNeon')   || 'Neon',   bg: '#1a1028', bg2: '#100a1e', starColor: 'rgba(232,67,147,0.3)', blockSat: 70, blockLight: 65, accent: '#e84393' },
  sunset: { name: () => I18N.t('stThemeSunset') || 'Sunset', bg: '#2d1b3d', bg2: '#1a0a18', starColor: 'rgba(255,180,200,0.3)', blockSat: 60, blockLight: 68, accent: '#fd79a8' },
  ice:    { name: () => I18N.t('stThemeIce')    || 'Ice',    bg: '#1a1a2e', bg2: '#0a0a1e', starColor: 'rgba(162,155,254,0.3)', blockSat: 55, blockLight: 70, accent: '#a29bfe' },
  retro:  { name: () => I18N.t('stThemeRetro')  || 'Retro',  bg: '#2d1b2d', bg2: '#100a10', starColor: 'rgba(250,177,160,0.3)', blockSat: 65, blockLight: 60, accent: '#fab1a0' },
};

let currentTheme = localStorage.getItem('stackTowerTheme') || 'neon';

// Populate theme dropdown
const themeSelect = document.getElementById('themeSelect');
for (const [key, th] of Object.entries(THEMES)) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = th.name();
  if (key === currentTheme) opt.selected = true;
  themeSelect.appendChild(opt);
}
themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value;
  localStorage.setItem('stackTowerTheme', currentTheme);
  document.body.className = currentTheme === 'neon' ? '' : `theme-${currentTheme}`;
});
if (currentTheme !== 'neon') document.body.className = `theme-${currentTheme}`;

// ── Audio ──
const Audio = (() => {
  let actx, master, muted = localStorage.getItem('stackTowerMuted') === '1';
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
    localStorage.setItem('stackTowerMuted', muted ? '1' : '0');
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  function isMuted() { return muted; }
  function playTone(freq, dur, type, vol) {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime((vol || 0.3), actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + dur);
  }
  function playNoise(dur, vol) {
    if (!actx || muted) return;
    const bufSize = actx.sampleRate * dur;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol || 0.15, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    src.connect(g); g.connect(master);
    src.start(); src.stop(actx.currentTime + dur);
  }
  function playDrop() { playTone(120, 0.15, 'sine', 0.4); playNoise(0.08, 0.1); }
  function playPerfect(n) {
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', 0.3), i * 60);
    });
  }
  function playCutFall() {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.3);
    g.gain.setValueAtTime(0.2, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.3);
  }
  function playGameOver() {
    [330, 294, 262].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'sine', 0.25), i * 200);
    });
  }
  return { init, resume, toggle, isMuted, playDrop, playPerfect, playCutFall, playGameOver };
})();

// ── Mute / Fullscreen ──
const muteBtn = document.getElementById('muteButton');
muteBtn.textContent = Audio.isMuted() ? '\u{1F507}' : '\u{1F50A}';
muteBtn.addEventListener('click', () => {
  Audio.init(); Audio.resume();
  const m = Audio.toggle();
  muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
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
  { id: 'stFirstFloor',     icon: '\u{1F3D7}', title: () => I18N.t('achStFirstFloor')     || 'First Floor',     desc: () => I18N.t('achStFirstFloorDesc')     || 'Stack 1 block',         check: s => s.bestScore >= 1 },
  { id: 'stGettingThere',   icon: '\u{1F3E2}', title: () => I18N.t('achStGettingThere')   || 'Getting There',   desc: () => I18N.t('achStGettingThereDesc')   || 'Stack 10 blocks',       check: s => s.bestScore >= 10 },
  { id: 'stHighRise',       icon: '\u{1F3E8}', title: () => I18N.t('achStHighRise')       || 'High Rise',       desc: () => I18N.t('achStHighRiseDesc')       || 'Stack 25 blocks',       check: s => s.bestScore >= 25 },
  { id: 'stSkyscraper',     icon: '\u{1F3D9}', title: () => I18N.t('achStSkyscraper')     || 'Skyscraper',      desc: () => I18N.t('achStSkyscraperDesc')     || 'Stack 50 blocks',       check: s => s.bestScore >= 50 },
  { id: 'stHatTrick',       icon: '\u{1F3AF}', title: () => I18N.t('achStHatTrick')       || 'Hat Trick',       desc: () => I18N.t('achStHatTrickDesc')       || '3 perfect drops in a row', check: s => s.bestPerfectStreak >= 3 },
  { id: 'stPrecisionMaster',icon: '\u{2B50}',  title: () => I18N.t('achStPrecisionMaster')|| 'Precision Master', desc: () => I18N.t('achStPrecisionMasterDesc')|| '10 total perfect drops',   check: s => s.totalPerfects >= 10 },
  { id: 'stComebackKing',   icon: '\u{1F451}', title: () => I18N.t('achStComebackKing')   || 'Comeback King',   desc: () => I18N.t('achStComebackKingDesc')   || 'Grow back to full width',  check: s => s.comeback },
  { id: 'stAddicted',       icon: '\u{1F525}', title: () => I18N.t('achStAddicted')       || 'Addicted',        desc: () => I18N.t('achStAddictedDesc')       || 'Play 20 games',            check: s => s.gamesPlayed >= 20 },
];

let achData = JSON.parse(localStorage.getItem('stackTowerAch') || '{"unlocked":[],"stats":{"bestScore":0,"gamesPlayed":0,"totalPerfects":0,"bestPerfectStreak":0,"comeback":false}}');
let achQueue = [];

function saveAch() { localStorage.setItem('stackTowerAch', JSON.stringify(achData)); }
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
  try {
    const panel = Leaderboard.createPanel('stack-tower');
    document.getElementById('leaderboardPanel').appendChild(panel);
    lbReady = true;
  } catch (e) {}
}
document.getElementById('leaderboardToggle').addEventListener('click', () => {
  initLB();
  const p = document.getElementById('leaderboardPanel');
  p.style.display = p.style.display === 'none' ? '' : 'none';
});

// ── Stars background ──
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * CW,
  y: Math.random() * CH,
  s: 0.5 + Math.random() * 1.5,
  tw: Math.random() * Math.PI * 2,
}));

// ── Particles ──
let particles = [];
function spawnParticles(x, y, hue, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 200,
      vy: -50 - Math.random() * 150,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1,
      size: 2 + Math.random() * 3,
      hue: hue + Math.random() * 30 - 15,
    });
  }
}

// ── Falling pieces ──
let fallingPieces = [];

// ── Game State ──
let stack = [];
let moving = null; // { x, y, w, dir }
let score = 0;
let bestScore = parseInt(localStorage.getItem('stackTowerBest') || '0');
let gameOver = false;
let gameStarted = false;
let perfectStreak = 0;
let sessionPerfects = 0;
let hadComeback = false;
let minWidthReached = false;
let speed = BASE_SPEED;
let time = 0;

document.getElementById('bestScore').textContent = bestScore;

function resetGame() {
  stack = [];
  fallingPieces = [];
  particles = [];
  score = 0;
  perfectStreak = 0;
  sessionPerfects = 0;
  hadComeback = false;
  minWidthReached = false;
  speed = BASE_SPEED;
  gameOver = false;
  gameStarted = true;

  // Base block
  const baseX = (CW - INIT_WIDTH) / 2;
  const baseY = CH - BLOCK_H - 20;
  stack.push({ x: baseX, y: baseY, w: INIT_WIDTH, hue: 0 });

  // First moving block
  spawnMoving();
  document.getElementById('score').textContent = '0';

  Audio.init();
  Audio.resume();
}

function spawnMoving() {
  const top = stack[stack.length - 1];
  const y = top.y - BLOCK_H;
  const hue = (stack.length * 25) % 360;
  moving = { x: 0, y, w: top.w, dir: 1, hue };
}

function dropBlock() {
  if (gameOver || !moving) return;

  const top = stack[stack.length - 1];
  const overlap = Math.min(moving.x + moving.w, top.x + top.w) - Math.max(moving.x, top.x);

  if (overlap <= 0) {
    // Complete miss
    fallingPieces.push({ x: moving.x, y: moving.y, w: moving.w, hue: moving.hue, vy: 0, rot: 0, vrot: (Math.random() - 0.5) * 5 });
    Audio.playCutFall();
    endGame();
    return;
  }

  const offset = Math.abs(moving.x - top.x);
  const isPerfect = offset <= PERFECT_THRESHOLD;

  Audio.playDrop();

  if (isPerfect) {
    // Perfect drop — snap to exact position, keep width
    perfectStreak++;
    sessionPerfects++;
    let w = top.w;
    if (perfectStreak >= STREAK_THRESHOLD && w < INIT_WIDTH) {
      w = Math.min(w + PERFECT_GROW, INIT_WIDTH);
      if (w >= INIT_WIDTH && minWidthReached) hadComeback = true;
    }
    const block = { x: top.x, y: moving.y, w, hue: moving.hue };
    stack.push(block);
    spawnParticles(top.x + w / 2, moving.y, moving.hue, 15);
    Audio.playPerfect(perfectStreak);
  } else {
    // Partial overlap
    perfectStreak = 0;
    const newX = Math.max(moving.x, top.x);
    const newW = overlap;

    if (newW < MIN_WIDTH) {
      endGame();
      return;
    }

    if (newW < INIT_WIDTH * 0.5) minWidthReached = true;

    // Falling cut-off piece
    const cutDir = moving.x < top.x ? -1 : 1;
    let cutX, cutW;
    if (moving.x < top.x) {
      cutX = moving.x;
      cutW = top.x - moving.x;
    } else {
      cutX = top.x + top.w;
      cutW = (moving.x + moving.w) - (top.x + top.w);
    }
    if (cutW > 0) {
      fallingPieces.push({ x: cutX, y: moving.y, w: cutW, hue: moving.hue, vy: 0, rot: 0, vrot: cutDir * 3 });
      Audio.playCutFall();
    }

    stack.push({ x: newX, y: moving.y, w: newW, hue: moving.hue });
  }

  score++;
  speed = Math.min(BASE_SPEED + score * SPEED_INC, MAX_SPEED);
  document.getElementById('score').textContent = score;

  // Scroll stack down if needed
  if (stack.length > 15) {
    const shift = BLOCK_H;
    for (const b of stack) b.y += shift;
    for (const f of fallingPieces) f.y += shift;
    for (const p of particles) p.y += shift;
  }

  spawnMoving();
}

function endGame() {
  gameOver = true;
  moving = null;
  Audio.playGameOver();

  // Update stats
  achData.stats.gamesPlayed++;
  if (score > achData.stats.bestScore) achData.stats.bestScore = score;
  achData.stats.totalPerfects += sessionPerfects;
  if (perfectStreak > achData.stats.bestPerfectStreak) achData.stats.bestPerfectStreak = perfectStreak;
  if (hadComeback) achData.stats.comeback = true;
  checkAch();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('stackTowerBest', bestScore);
    document.getElementById('bestScore').textContent = bestScore;
  }

  // Submit to leaderboard
  try { initLB(); Leaderboard.submitScore('stack-tower', score); } catch (e) {}
}

// ── Controls ──
function handleInput() {
  if (gameOver) { resetGame(); return; }
  if (!gameStarted) { resetGame(); return; }
  dropBlock();
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); handleInput(); }
});
canvas.addEventListener('pointerdown', e => { e.preventDefault(); handleInput(); });

document.getElementById('restartButton').addEventListener('click', resetGame);

// ── Render ──
function drawStarfield(t) {
  const theme = THEMES[currentTheme];
  for (const s of stars) {
    const alpha = 0.15 + Math.sin(t * 2 + s.tw) * 0.15;
    ctx.fillStyle = theme.starColor.replace(/[\d.]+\)$/, alpha.toFixed(2) + ')');
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBlock(b, glow) {
  const theme = THEMES[currentTheme];
  const color = `hsl(${b.hue}, ${theme.blockSat}%, ${theme.blockLight}%)`;
  const lightColor = `hsl(${b.hue}, ${theme.blockSat}%, ${theme.blockLight + 12}%)`;

  if (glow) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = theme.accent || `hsla(${b.hue}, ${theme.blockSat}%, ${theme.blockLight}%, 0.5)`;
  }

  const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BLOCK_H);
  grad.addColorStop(0, lightColor);
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, `hsl(${b.hue}, ${theme.blockSat}%, ${theme.blockLight - 10}%)`);
  ctx.fillStyle = grad;

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, BLOCK_H, 5);
    ctx.fill();
  } else {
    ctx.fillRect(b.x, b.y, b.w, BLOCK_H);
  }

  // Soft anime-style shine highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(b.x + 3, b.y + 2, b.w - 6, 4, 2);
    ctx.fill();
  } else {
    ctx.fillRect(b.x + 3, b.y + 2, b.w - 6, 4);
  }

  ctx.shadowBlur = 0;
}

function update(dt) {
  time += dt;

  // Move current block
  if (moving) {
    moving.x += speed * moving.dir;
    if (moving.x + moving.w > CW) { moving.dir = -1; moving.x = CW - moving.w; }
    if (moving.x < 0) { moving.dir = 1; moving.x = 0; }
  }

  // Update falling pieces
  for (let i = fallingPieces.length - 1; i >= 0; i--) {
    const f = fallingPieces[i];
    f.vy += 600 * dt;
    f.y += f.vy * dt;
    f.rot += f.vrot * dt;
    if (f.y > CH + 100) fallingPieces.splice(i, 1);
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function render() {
  const theme = THEMES[currentTheme];
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
  bgGrad.addColorStop(0, theme.bg);
  bgGrad.addColorStop(1, theme.bg2 || '#100a1e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CW, CH);

  drawStarfield(time);

  // Draw stack
  for (const b of stack) drawBlock(b, false);

  // Draw moving block
  if (moving) drawBlock(moving, true);

  // Draw falling pieces
  for (const f of fallingPieces) {
    ctx.save();
    ctx.translate(f.x + f.w / 2, f.y + BLOCK_H / 2);
    ctx.rotate(f.rot);
    ctx.globalAlpha = Math.max(0, 1 - f.vy / 500);
    const color = `hsl(${f.hue}, ${THEMES[currentTheme].blockSat}%, ${THEMES[currentTheme].blockLight}%)`;
    ctx.fillStyle = color;
    ctx.fillRect(-f.w / 2, -BLOCK_H / 2, f.w, BLOCK_H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Draw particles
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `hsla(${p.hue}, 70%, 75%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  // Perfect streak indicator
  if (perfectStreak >= 2 && !gameOver) {
    ctx.save();
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232, 67, 147, ${0.6 + Math.sin(time * 5) * 0.3})`;
    ctx.fillText(`${perfectStreak}x PERFECT`, CW / 2, 40);
    ctx.restore();
  }

  // Game over overlay
  if (gameOver) {
    ctx.fillStyle = 'rgba(26,16,40,0.75)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e84393';
    ctx.fillText(I18N.t('gameOver') || 'Game Over', CW / 2, CH / 2 - 30);
    ctx.font = '24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232,67,147,0.7)';
    ctx.fillText(`${I18N.t('score') || 'Score'}: ${score}`, CW / 2, CH / 2 + 15);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(I18N.t('tapToRestart') || 'Tap to restart', CW / 2, CH / 2 + 50);
  }

  // Start screen
  if (!gameStarted) {
    ctx.fillStyle = 'rgba(26,16,40,0.75)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e84393';
    ctx.fillText(I18N.t('stackTowerTitle') || 'Stack Tower', CW / 2, CH / 2 - 20);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(I18N.t('tapToStart') || 'Tap or press Space to start', CW / 2, CH / 2 + 20);
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
