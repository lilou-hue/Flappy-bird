/* ═══════════════════════════════════════════════════════════
   Neon Pong – Versus game with AI opponent & power-ups
   ═══════════════════════════════════════════════════════════ */

// ── i18n ──
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();
window.addEventListener('langchange', () => { I18N.applyDOM(); renderAchList(); });

// ── Constants ──
const CW = 640, CH = 480;
const PADDLE_W = 12, PADDLE_H = 80;
const BALL_R = 8;
const BASE_BALL_SPEED = 5.0;
const BALL_SPEED_INC = 0.2;
const MAX_BALL_SPEED = 10.0;
const WIN_SCORE = 11;
const MAX_BOUNCE_ANGLE = 65 * Math.PI / 180;
const POWERUP_INTERVAL = 8000;
const BIG_PADDLE_H = 130;

// ── Canvas ──
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Themes ──
const THEMES = {
  neon:      { name: () => I18N.t('npThemeNeon')      || 'Neon',      bg: '#060612', playerColor: '#00d4ff', aiColor: '#ff69b4', ballColor: '#fff', lineColor: 'rgba(255,255,255,0.15)' },
  retro:     { name: () => I18N.t('npThemeRetro')     || 'Retro',     bg: '#001100', playerColor: '#00ff00', aiColor: '#00ff00', ballColor: '#00ff00', lineColor: 'rgba(0,255,0,0.15)' },
  synthwave: { name: () => I18N.t('npThemeSynthwave') || 'Synthwave', bg: '#10061a', playerColor: '#b060ff', aiColor: '#ff8030', ballColor: '#fff', lineColor: 'rgba(180,100,255,0.15)' },
  minimal:   { name: () => I18N.t('npThemeMinimal')   || 'Minimal',   bg: '#111111', playerColor: '#ccc', aiColor: '#888', ballColor: '#fff', lineColor: 'rgba(255,255,255,0.08)' },
};

let currentTheme = localStorage.getItem('neonPongTheme') || 'neon';

const themeSelect = document.getElementById('themeSelect');
for (const [key, th] of Object.entries(THEMES)) {
  const opt = document.createElement('option');
  opt.value = key; opt.textContent = th.name();
  if (key === currentTheme) opt.selected = true;
  themeSelect.appendChild(opt);
}
themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value;
  localStorage.setItem('neonPongTheme', currentTheme);
  document.body.className = currentTheme === 'neon' ? '' : `theme-${currentTheme}`;
});
if (currentTheme !== 'neon') document.body.className = `theme-${currentTheme}`;

// ── Difficulty ──
const DIFFICULTIES = {
  easy:   { reactionDelay: 0.25, speedFactor: 0.38, noise: 55, trackZone: 0.45 },
  medium: { reactionDelay: 0.12, speedFactor: 0.55, noise: 30, trackZone: 0.35 },
  hard:   { reactionDelay: 0.04, speedFactor: 0.78, noise: 12, trackZone: 0.25 },
};

let difficulty = localStorage.getItem('neonPongDiff') || 'medium';
const diffSelect = document.getElementById('difficultySelect');
diffSelect.value = difficulty;
diffSelect.addEventListener('change', () => {
  difficulty = diffSelect.value;
  localStorage.setItem('neonPongDiff', difficulty);
});

// ── Audio ──
const Audio = (() => {
  let actx, master, muted = localStorage.getItem('neonPongMuted') === '1';
  function init() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = muted ? 0 : 0.4;
    master.connect(actx.destination);
  }
  function resume() { if (actx && actx.state === 'suspended') actx.resume(); }
  function toggle() {
    muted = !muted;
    localStorage.setItem('neonPongMuted', muted ? '1' : '0');
    if (master) master.gain.value = muted ? 0 : 0.4;
    return muted;
  }
  function isMuted() { return muted; }
  function playTone(freq, dur, type, vol) {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + dur);
  }
  function playPaddleHit() { playTone(440, 0.08, 'square', 0.2); }
  function playWallHit() { playTone(600, 0.06, 'square', 0.15); }
  function playScore() { playTone(330, 0.15, 'sine', 0.25); }
  function playPowerup() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.1, 'triangle', 0.2), i * 50));
  }
  function playFreeze() {
    if (!actx || muted) return;
    const bufSize = actx.sampleRate * 0.2;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = buf;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.15, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
    src.connect(g); g.connect(master);
    src.start(); src.stop(actx.currentTime + 0.2);
  }
  function playVictory() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'triangle', 0.25), i * 120));
  }
  function playDefeat() {
    [330, 294, 262].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.2), i * 200));
  }
  return { init, resume, toggle, isMuted, playPaddleHit, playWallHit, playScore, playPowerup, playFreeze, playVictory, playDefeat };
})();

// ── Mute / Fullscreen ──
const muteBtn = document.getElementById('muteButton');
muteBtn.textContent = Audio.isMuted() ? '\u{1F507}' : '\u{1F50A}';
muteBtn.addEventListener('click', () => {
  Audio.init(); Audio.resume();
  muteBtn.textContent = Audio.toggle() ? '\u{1F507}' : '\u{1F50A}';
});

document.getElementById('fullscreenButton').addEventListener('click', () => {
  const el = document.getElementById('gameContainer');
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
  }
});

// ── Achievements ──
const ACH = [
  { id: 'npFirstVictory',  icon: '\u{1F3C6}', title: () => I18N.t('achNpFirstVictory')  || 'First Victory',   desc: () => I18N.t('achNpFirstVictoryDesc')  || 'Win your first match',      check: s => s.wins >= 1 },
  { id: 'npFlawless',      icon: '\u{1F48E}', title: () => I18N.t('achNpFlawless')      || 'Flawless',        desc: () => I18N.t('achNpFlawlessDesc')      || 'Win 11-0',                   check: s => s.flawless },
  { id: 'npNeverGiveUp',   icon: '\u{1F4AA}', title: () => I18N.t('achNpNeverGiveUp')   || 'Never Give Up',   desc: () => I18N.t('achNpNeverGiveUpDesc')   || 'Comeback from 5+ down',      check: s => s.comeback5 },
  { id: 'npPowerHungry',   icon: '\u{26A1}',  title: () => I18N.t('achNpPowerHungry')   || 'Power Hungry',    desc: () => I18N.t('achNpPowerHungryDesc')   || 'Collect 20 power-ups',       check: s => s.powerupsCollected >= 20 },
  { id: 'npIceCold',       icon: '\u{2744}',  title: () => I18N.t('achNpIceCold')       || 'Ice Cold',        desc: () => I18N.t('achNpIceColdDesc')       || 'Score while opponent frozen', check: s => s.frozenScores >= 1 },
  { id: 'npChaosTheory',   icon: '\u{1F300}', title: () => I18N.t('achNpChaosTheory')   || 'Chaos Theory',    desc: () => I18N.t('achNpChaosTheoryDesc')   || '3+ balls at once',           check: s => s.maxBalls >= 3 },
  { id: 'npHardModeHero',  icon: '\u{1F9E0}', title: () => I18N.t('achNpHardModeHero')  || 'Hard Mode Hero',  desc: () => I18N.t('achNpHardModeHeroDesc')  || 'Win on Hard',                check: s => s.hardWin },
  { id: 'npPongVeteran',   icon: '\u{1F3AE}', title: () => I18N.t('achNpPongVeteran')   || 'Pong Veteran',    desc: () => I18N.t('achNpPongVeteranDesc')   || 'Play 30 games',              check: s => s.gamesPlayed >= 30 },
];

let achData = JSON.parse(localStorage.getItem('neonPongAch') || '{"unlocked":[],"stats":{"wins":0,"gamesPlayed":0,"flawless":false,"comeback5":false,"powerupsCollected":0,"frozenScores":0,"maxBalls":0,"hardWin":false}}');
let achQueue = [];

function saveAch() { localStorage.setItem('neonPongAch', JSON.stringify(achData)); }
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
  try { const p = Leaderboard.createPanel('neon-pong'); document.getElementById('leaderboardPanel').appendChild(p); lbReady = true; } catch (e) {}
}
document.getElementById('leaderboardToggle').addEventListener('click', () => {
  initLB();
  const p = document.getElementById('leaderboardPanel');
  p.style.display = p.style.display === 'none' ? '' : 'none';
});

// ── Game State ──
let playerY, aiY, playerScore, aiScore;
let balls = [];
let powerups = [];
let keys = {};
let gameActive = false;
let matchOver = false;
let time = 0;
let powerupTimer = 0;
let playerFrozen = 0, aiFrozen = 0;
let playerPaddleH = PADDLE_H, aiPaddleH = PADDLE_H;
let playerPaddleTimer = 0, aiPaddleTimer = 0;
let ballTrails = [];
let maxBallsThisGame = 1;
let bestDown = 0;
let scoredWhileFrozen = false;
let aiNoiseOffset = 0;

function createBall(dir) {
  const angle = (Math.random() * 0.8 - 0.4);
  return {
    x: CW / 2, y: CH / 2,
    vx: Math.cos(angle) * BASE_BALL_SPEED * dir,
    vy: Math.sin(angle) * BASE_BALL_SPEED * dir,
    speed: BASE_BALL_SPEED,
    speedMul: 1,
    speedTimer: 0,
  };
}

function resetGame() {
  playerY = CH / 2 - PADDLE_H / 2;
  aiY = CH / 2 - PADDLE_H / 2;
  playerScore = 0; aiScore = 0;
  balls = [createBall(1)];
  powerups = [];
  matchOver = false;
  gameActive = true;
  powerupTimer = 0;
  playerFrozen = 0; aiFrozen = 0;
  playerPaddleH = PADDLE_H; aiPaddleH = PADDLE_H;
  playerPaddleTimer = 0; aiPaddleTimer = 0;
  ballTrails = [];
  maxBallsThisGame = 1;
  bestDown = 0;
  scoredWhileFrozen = false;
  aiNoiseOffset = 0;
  updateHUD();
  Audio.init(); Audio.resume();
}

function updateHUD() {
  document.getElementById('score').textContent = playerScore;
  document.getElementById('bestScore').textContent = aiScore;
}

function spawnPowerup() {
  const types = ['speed', 'big', 'multi', 'freeze'];
  const type = types[Math.floor(Math.random() * types.length)];
  const colors = { speed: '#ffdd00', big: '#00ff88', multi: '#ff8800', freeze: '#88ddff' };
  powerups.push({
    x: CW / 4 + Math.random() * CW / 2,
    y: 40 + Math.random() * (CH - 80),
    type, color: colors[type],
    time: 0,
  });
}

function applyPowerup(type, side) {
  Audio.playPowerup();
  if (side === 'player') achData.stats.powerupsCollected++;

  if (type === 'speed') {
    for (const b of balls) { b.speedMul = 1.5; b.speedTimer = 5; }
  } else if (type === 'big') {
    if (side === 'player') { playerPaddleH = BIG_PADDLE_H; playerPaddleTimer = 8; }
    else { aiPaddleH = BIG_PADDLE_H; aiPaddleTimer = 8; }
  } else if (type === 'multi') {
    const newBalls = [];
    for (let i = 0; i < 2; i++) {
      const b = createBall(Math.random() > 0.5 ? 1 : -1);
      b.y = balls[0] ? balls[0].y : CH / 2;
      newBalls.push(b);
    }
    balls.push(...newBalls);
    if (balls.length > maxBallsThisGame) maxBallsThisGame = balls.length;
    if (maxBallsThisGame >= 3) achData.stats.maxBalls = Math.max(achData.stats.maxBalls, maxBallsThisGame);
  } else if (type === 'freeze') {
    if (side === 'player') { aiFrozen = 3; Audio.playFreeze(); }
    else { playerFrozen = 3; Audio.playFreeze(); }
  }
}

// ── Controls ──
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (!gameActive && !matchOver) { e.preventDefault(); resetGame(); }
  if (matchOver) { e.preventDefault(); resetGame(); }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('pointerdown', e => {
  if (!gameActive && !matchOver) { resetGame(); return; }
  if (matchOver) { resetGame(); return; }
});

let touchY = null;
canvas.addEventListener('pointermove', e => {
  if (!gameActive) return;
  const rect = canvas.getBoundingClientRect();
  const scale = CH / rect.height;
  const y = (e.clientY - rect.top) * scale;
  playerY = Math.max(0, Math.min(CH - playerPaddleH, y - playerPaddleH / 2));
});

document.getElementById('restartButton').addEventListener('click', resetGame);

// ── AI ──
function updateAI(dt) {
  if (aiFrozen > 0) return;
  const diff = DIFFICULTIES[difficulty];
  const targetBall = balls.reduce((best, b) => (!best || b.x > best.x) ? b : best, null);
  if (!targetBall) return;

  // Only track when ball is on AI's side of the field
  const trackThreshold = CW * (1 - diff.trackZone);
  if (targetBall.vx < 0 || targetBall.x < trackThreshold) {
    // Ball heading away or too far — drift toward center
    const center = aiY + aiPaddleH / 2;
    const mid = CH / 2;
    if (Math.abs(center - mid) > 10) {
      aiY += (mid > center ? 1 : -1) * 1.5;
    }
    aiY = Math.max(0, Math.min(CH - aiPaddleH, aiY));
    return;
  }

  // Persistent noise: update slowly instead of every frame
  if (Math.random() < 0.05) aiNoiseOffset = (Math.random() - 0.5) * diff.noise * 2;

  const targetY = targetBall.y + aiNoiseOffset;
  const center = aiY + aiPaddleH / 2;
  const maxMove = 5 * diff.speedFactor;

  if (Math.random() > diff.reactionDelay) {
    if (targetY > center + 5) aiY += Math.min(maxMove, targetY - center);
    else if (targetY < center - 5) aiY -= Math.min(maxMove, center - targetY);
  }
  aiY = Math.max(0, Math.min(CH - aiPaddleH, aiY));
}

// ── Update ──
function update(dt) {
  if (!gameActive) return;
  time += dt;

  // Player movement
  const pSpeed = 6;
  if (playerFrozen <= 0) {
    if (keys['w'] || keys['W'] || keys['ArrowUp']) playerY -= pSpeed;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) playerY += pSpeed;
  }
  playerY = Math.max(0, Math.min(CH - playerPaddleH, playerY));

  // Timers
  if (playerFrozen > 0) playerFrozen -= dt;
  if (aiFrozen > 0) aiFrozen -= dt;
  if (playerPaddleTimer > 0) { playerPaddleTimer -= dt; if (playerPaddleTimer <= 0) playerPaddleH = PADDLE_H; }
  if (aiPaddleTimer > 0) { aiPaddleTimer -= dt; if (aiPaddleTimer <= 0) aiPaddleH = PADDLE_H; }

  // AI
  updateAI(dt);

  // Power-ups
  powerupTimer += dt * 1000;
  if (powerupTimer >= POWERUP_INTERVAL) {
    powerupTimer = 0;
    if (powerups.length < 2) spawnPowerup();
  }

  // Update power-up animations
  for (const p of powerups) p.time += dt;

  // Balls
  for (let bi = balls.length - 1; bi >= 0; bi--) {
    const b = balls[bi];

    // Speed timer
    if (b.speedTimer > 0) { b.speedTimer -= dt; if (b.speedTimer <= 0) b.speedMul = 1; }

    // Move
    const spd = b.speedMul;
    b.x += b.vx * spd;
    b.y += b.vy * spd;

    // Wall bounce
    if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); Audio.playWallHit(); }
    if (b.y + BALL_R >= CH) { b.y = CH - BALL_R; b.vy = -Math.abs(b.vy); Audio.playWallHit(); }

    // Player paddle collision
    if (b.vx < 0 && b.x - BALL_R <= PADDLE_W + 20 && b.x - BALL_R >= 18 &&
        b.y >= playerY && b.y <= playerY + playerPaddleH) {
      const rel = (b.y - playerY) / playerPaddleH - 0.5;
      const angle = rel * MAX_BOUNCE_ANGLE;
      b.speed = Math.min(b.speed + BALL_SPEED_INC, MAX_BALL_SPEED);
      b.vx = Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
      b.x = PADDLE_W + 20 + BALL_R;
      Audio.playPaddleHit();
    }

    // AI paddle collision
    if (b.vx > 0 && b.x + BALL_R >= CW - PADDLE_W - 20 && b.x + BALL_R <= CW - 18 &&
        b.y >= aiY && b.y <= aiY + aiPaddleH) {
      const rel = (b.y - aiY) / aiPaddleH - 0.5;
      const angle = rel * MAX_BOUNCE_ANGLE;
      b.speed = Math.min(b.speed + BALL_SPEED_INC, MAX_BALL_SPEED);
      b.vx = -Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
      b.x = CW - PADDLE_W - 20 - BALL_R;
      Audio.playPaddleHit();
    }

    // Power-up collision
    for (let pi = powerups.length - 1; pi >= 0; pi--) {
      const p = powerups[pi];
      const dx = b.x - p.x, dy = b.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_R + 12) {
        const side = b.vx > 0 ? 'player' : 'ai';
        applyPowerup(p.type, side);
        powerups.splice(pi, 1);
      }
    }

    // Score
    if (b.x < -20) {
      if (balls.length <= 1) {
        aiScore++;
        if (aiFrozen > 0) scoredWhileFrozen = true;
        Audio.playScore();
        updateHUD();
        const deficit = aiScore - playerScore;
        if (deficit > bestDown) bestDown = deficit;
        if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) { endMatch(); return; }
        balls[bi] = createBall(1);
      } else {
        balls.splice(bi, 1);
      }
      continue;
    }
    if (b.x > CW + 20) {
      if (balls.length <= 1) {
        playerScore++;
        if (aiFrozen > 0) { scoredWhileFrozen = true; achData.stats.frozenScores++; }
        Audio.playScore();
        updateHUD();
        if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) { endMatch(); return; }
        balls[bi] = createBall(-1);
      } else {
        balls.splice(bi, 1);
      }
      continue;
    }

    // Trail
    ballTrails.push({ x: b.x, y: b.y, age: 0 });
  }

  // Trail aging
  for (let i = ballTrails.length - 1; i >= 0; i--) {
    ballTrails[i].age += dt;
    if (ballTrails[i].age > 0.15) ballTrails.splice(i, 1);
  }
}

function endMatch() {
  gameActive = false;
  matchOver = true;
  achData.stats.gamesPlayed++;

  if (playerScore >= WIN_SCORE) {
    achData.stats.wins++;
    Audio.playVictory();
    if (aiScore === 0) achData.stats.flawless = true;
    if (bestDown >= 5) achData.stats.comeback5 = true;
    if (difficulty === 'hard') achData.stats.hardWin = true;
    try { initLB(); Leaderboard.submitScore('neon-pong', playerScore * 100 + (WIN_SCORE - aiScore) * 10); } catch (e) {}
  } else {
    Audio.playDefeat();
  }
  checkAch();
}

// ── Render ──
function render() {
  const theme = THEMES[currentTheme];
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, CW, CH);

  // Center line
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = theme.lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CW / 2, 0);
  ctx.lineTo(CW / 2, CH);
  ctx.stroke();
  ctx.setLineDash([]);

  // Paddles
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = theme.playerColor;
  ctx.fillStyle = theme.playerColor;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(20, playerY, PADDLE_W, playerPaddleH, 4); ctx.fill(); }
  else ctx.fillRect(20, playerY, PADDLE_W, playerPaddleH);
  if (playerFrozen > 0) {
    ctx.fillStyle = 'rgba(136,221,255,0.4)';
    ctx.fillRect(18, playerY - 2, PADDLE_W + 4, playerPaddleH + 4);
  }
  ctx.shadowColor = theme.aiColor;
  ctx.fillStyle = theme.aiColor;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(CW - 20 - PADDLE_W, aiY, PADDLE_W, aiPaddleH, 4); ctx.fill(); }
  else ctx.fillRect(CW - 20 - PADDLE_W, aiY, PADDLE_W, aiPaddleH);
  if (aiFrozen > 0) {
    ctx.fillStyle = 'rgba(136,221,255,0.4)';
    ctx.fillRect(CW - 22 - PADDLE_W, aiY - 2, PADDLE_W + 4, aiPaddleH + 4);
  }
  ctx.restore();

  // Ball trails
  for (const t of ballTrails) {
    const alpha = 1 - t.age / 0.15;
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.3})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, BALL_R * alpha * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Balls
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = theme.ballColor;
  ctx.fillStyle = theme.ballColor;
  for (const b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Power-ups
  for (const p of powerups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.time * 2);
    const pulse = 10 + Math.sin(p.time * 4) * 3;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + Math.sin(p.time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = { speed: 'S', big: 'B', multi: 'M', freeze: 'F' };
    ctx.fillText(labels[p.type], 0, 0);
    ctx.restore();
  }

  // Scores on canvas
  ctx.font = 'bold 48px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillText(playerScore, CW / 4, 60);
  ctx.fillText(aiScore, 3 * CW / 4, 60);

  // Match over overlay
  if (matchOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    const msg = playerScore >= WIN_SCORE ? (I18N.t('npYouWin') || 'You Win!') : (I18N.t('npYouLose') || 'You Lose');
    ctx.fillText(msg, CW / 2, CH / 2 - 20);
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${playerScore} - ${aiScore}`, CW / 2, CH / 2 + 20);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(I18N.t('tapToRestart') || 'Tap to restart', CW / 2, CH / 2 + 55);
  }

  // Start screen
  if (!gameActive && !matchOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(I18N.t('neonPongTitle') || 'Neon Pong', CW / 2, CH / 2 - 20);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(I18N.t('tapToStart') || 'Tap or press any key to start', CW / 2, CH / 2 + 20);
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
